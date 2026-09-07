const crypto = require('crypto');
const fs = require('fs');

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

let source = fs.readFileSync('worker.js', 'utf8');
source = source.replace(/export\s+default\s+/, 'module.exports.default = ');

const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(source, 'utf8', 'base64');
encrypted += cipher.final('base64');

const loader = `const __k = Uint8Array.from(atob("${key.toString('base64')}"), c => c.charCodeAt(0));
const __iv = Uint8Array.from(atob("${iv.toString('base64')}"), c => c.charCodeAt(0));
const __enc = Uint8Array.from(atob("${encrypted}"), c => c.charCodeAt(0));

let __handlerPromise = null;
async function __load() {
  const cryptoKey = await crypto.subtle.importKey("raw", __k, "AES-CBC", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv: __iv }, cryptoKey, __enc);
  const code = new TextDecoder().decode(decrypted);
  const module = { exports: {} };
  const fn = new Function("module", "exports", code);
  fn(module, module.exports);
  return module.exports.default;
}
function __getHandler() {
  if (!__handlerPromise) __handlerPromise = __load();
  return __handlerPromise;
}

export default {
  async fetch(request, env, ctx) {
    const handler = await __getHandler();
    return handler.fetch(request, env, ctx);
  }
};
`;

fs.writeFileSync('worker.encrypted.js', loader);
console.log('Encrypted successfully.');
