const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { transformSync } = require('@babel/core');

const sourcePath = path.resolve(process.cwd(), '../adminpanel/frontend/src/security/authClient.js');
const sourceCode = fs.readFileSync(sourcePath, 'utf8');
const { code } = transformSync(sourceCode, {
  filename: sourcePath,
  babelrc: false,
  configFile: false,
  presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' }, modules: 'commonjs' }]],
  plugins: [path.resolve(process.cwd(), 'babel-plugin-transform-import-meta-env.cjs')],
});

const loadedModule = { exports: {} };
const sandbox = {
  module: loadedModule,
  exports: loadedModule.exports,
  require,
  process,
  console,
  window,
  localStorage,
  Event,
  setTimeout,
  clearTimeout,
};

vm.runInNewContext(code, sandbox, { filename: sourcePath });

module.exports = loadedModule.exports;
