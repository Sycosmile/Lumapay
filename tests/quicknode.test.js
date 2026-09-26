const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  });

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(compiled.outputText, filename);
  return mod.exports;
}

const { extractSignatures, getSupportedMints, verifyQuickNodeSignature } =
  loadTypeScriptModule("lib/blockchain/quicknode.ts");

test("accepts a valid QuickNode webhook signature", () => {
  const secret = "test-secret";
  const nonce = "nonce-123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = JSON.stringify({ signature: "a".repeat(88) });
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${nonce}${timestamp}${payload}`, "utf8")
    .digest("hex");

  assert.equal(
    verifyQuickNodeSignature(payload, nonce, timestamp, expected, secret),
    true,
  );
});

test("rejects a QuickNode signature with a modified payload", () => {
  const secret = "test-secret";
  const nonce = "nonce-123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = '{"signature":"' + "a".repeat(88) + '"}';
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${nonce}${timestamp}${payload}`, "utf8")
    .digest("hex");

  assert.equal(
    verifyQuickNodeSignature(payload + " ", nonce, timestamp, expected, secret),
    false,
  );
});

test("rejects a stale QuickNode timestamp", () => {
  const secret = "test-secret";
  const nonce = "nonce-123";
  const timestamp = String(Math.floor(Date.now() / 1000) - 301);
  const payload = "{}";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${nonce}${timestamp}${payload}`, "utf8")
    .digest("hex");

  assert.equal(
    verifyQuickNodeSignature(payload, nonce, timestamp, signature, secret),
    false,
  );
});

test("rejects malformed or missing signature inputs", () => {
  assert.equal(verifyQuickNodeSignature("{}", "nonce", "not-a-time", "abcd", "secret"), false);
  assert.equal(verifyQuickNodeSignature("{}", null, "123", "abcd", "secret"), false);
  assert.equal(verifyQuickNodeSignature("{}", "nonce", "123", null, "secret"), false);
});

test("extracts supported signature field names recursively and de-duplicates", () => {
  const signature = "b".repeat(88);
  const other = "c".repeat(88);

  assert.deepEqual(
    extractSignatures({
      signature,
      nested: {
        transactionSignature: signature,
        values: [{ tx_signature: other }],
      },
      signatures: [other, signature, "too-short"],
    }).sort(),
    [other, signature].sort(),
  );
});

test("ignores non-string and short signature candidates", () => {
  assert.deepEqual(
    extractSignatures({
      signature: "short",
      transaction_signature: 123,
      signatures: [null, {}, "x".repeat(79)],
    }),
    [],
  );
});

test("loads supported mints only from configured environment values", () => {
  const originalUsdc = process.env.SOLANA_USDC_MINT;
  const originalUsdt = process.env.SOLANA_USDT_MINT;

  try {
    process.env.SOLANA_USDC_MINT = "USDC_MINT";
    delete process.env.SOLANA_USDT_MINT;

    assert.deepEqual([...getSupportedMints()], [["USDC_MINT", "USDC"]]);
  } finally {
    if (originalUsdc === undefined) delete process.env.SOLANA_USDC_MINT;
    else process.env.SOLANA_USDC_MINT = originalUsdc;

    if (originalUsdt === undefined) delete process.env.SOLANA_USDT_MINT;
    else process.env.SOLANA_USDT_MINT = originalUsdt;
  }
});
