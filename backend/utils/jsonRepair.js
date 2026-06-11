const stripBom = (value) => String(value || '').replace(/^\uFEFF/, '');

const stripFencesAndProse = (raw) => {
  let text = stripBom(raw).trim();
  text = text.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const firstBrace = text.search(/[{\[]/);
  if (firstBrace > 0) text = text.slice(firstBrace);
  return text;
};

const findBalancedEnd = (text) => {
  if (!text.length) return -1;
  const open = text[0];
  if (open !== '{' && open !== '[') return -1;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const normaliseTokens = (raw) => {
  let output = '';
  let inString = false;
  let escape = false;
  let stringChar = '"';

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (inString) {
      if (escape) {
        output += char;
        escape = false;
        continue;
      }
      if (char === '\\') {
        output += char;
        escape = true;
        continue;
      }
      if (char === stringChar) {
        output += '"';
        inString = false;
        continue;
      }
      if (char === '\u201c' || char === '\u201d') {
        output += '\\"';
        continue;
      }
      if (stringChar === "'" && char === '"') {
        output += '\\"';
        continue;
      }
      output += char;
      continue;
    }

    if (char === '"') {
      output += '"';
      inString = true;
      stringChar = '"';
      continue;
    }
    if (char === "'") {
      output += '"';
      inString = true;
      stringChar = "'";
      continue;
    }
    if (char === '\u201c') {
      output += '"';
      inString = true;
      stringChar = '\u201d';
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < raw.length && raw[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < raw.length - 1 && !(raw[index] === '*' && raw[index + 1] === '/')) index += 1;
      index += 1;
      continue;
    }
    output += char;
  }

  return output;
};

const removeTrailingCommas = (text) => text.replace(/,(\s*[}\]])/g, '$1');

const quoteUnquotedKeys = (text) =>
  text.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/g, '$1"$2":');

const closeUnbalanced = (text) => {
  const stack = [];
  let inString = false;
  let escape = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') stack.pop();
  }

  let next = text;
  if (inString) next += '"';
  next = next.replace(/,\s*$/, '').replace(/:\s*$/, ':null');
  while (stack.length) next += stack.pop();
  return next;
};

export const repairAndParseJson = (raw) => {
  if (raw === null || raw === undefined) throw new Error('Empty response');
  let text = stripFencesAndProse(String(raw));
  if (!text.length) throw new Error('No JSON found in response');

  const balancedEnd = findBalancedEnd(text);
  if (balancedEnd > 0) text = text.slice(0, balancedEnd + 1);

  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(removeTrailingCommas(text)),
    () => JSON.parse(quoteUnquotedKeys(removeTrailingCommas(text))),
    () => JSON.parse(quoteUnquotedKeys(removeTrailingCommas(normaliseTokens(text)))),
    () => JSON.parse(closeUnbalanced(quoteUnquotedKeys(removeTrailingCommas(normaliseTokens(text))))),
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not parse JSON: ${lastError?.message || 'unknown error'}`);
};



