// Shared Anthropic client. Every AI call in the backend should go through
// this module rather than constructing its own SDK client, so the provider
// only has to be swapped in one place.
import Anthropic from '@anthropic-ai/sdk';

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

export const isAiConfigured = () => Boolean(client);

// Converts OpenAI-shaped chat messages (role/content, content may be a plain
// string or an array of {type:'text'|'image_url', ...} parts) into Anthropic's
// Messages API shape: a separate `system` string plus a messages array whose
// content blocks use {type:'image', source:{type:'base64', media_type, data}}
// instead of {type:'image_url', image_url:{url: 'data:...'}}.
const toAnthropicPayload = (messages = []) => {
  const systemParts = [];
  const converted = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (typeof message.content === 'string') systemParts.push(message.content);
      continue;
    }

    let content;
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content.map((part) => {
        if (part.type === 'text') return { type: 'text', text: String(part.text || '') };
        if (part.type === 'image_url') {
          const url = part.image_url?.url || '';
          const match = /^data:([^;]+);base64,(.*)$/s.exec(url);
          if (match) {
            return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
          }
          return { type: 'text', text: '[unsupported image attachment]' };
        }
        return { type: 'text', text: String(part.text || '') };
      });
    } else {
      content = String(message.content ?? '');
    }

    converted.push({ role: message.role === 'assistant' ? 'assistant' : 'user', content });
  }

  return { system: systemParts.join('\n\n') || undefined, messages: converted };
};

// Non-streaming completion. Returns the full response text.
export const chatComplete = async ({ messages, maxTokens = 1024, temperature = 0.7 }) => {
  if (!client) throw new Error('AI provider is not configured');
  const { system, messages: anthropicMessages } = toAnthropicPayload(messages);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: anthropicMessages,
  });
  return response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
};

// Streaming completion. Async-iterate to get text deltas as they arrive.
export async function* chatCompleteStream({ messages, maxTokens = 4096, temperature = 0.35 }) {
  if (!client) throw new Error('AI provider is not configured');
  const { system, messages: anthropicMessages } = toAnthropicPayload(messages);
  const stream = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: anthropicMessages,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
