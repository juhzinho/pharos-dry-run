import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceDelta, bufferedGas, buildCall, decide, finish, predictBalances, SAMPLES } from "../lib/dry-run.js";

const FROM = SAMPLES.pass.from;
const TO = SAMPLES.pass.to;

test("a USDC transfer encodes transfer(address,uint256)", () => {
  const call = buildCall({ ...SAMPLES.pass, lang: "en" });
  assert.equal(call.kind, "transfer");
  assert.equal(call.data.slice(0, 10), "0xa9059cbb");
  assert.equal(call.amount, 1_000_000n);
  assert.equal(call.value, 0n);
  assert.equal(call.from, FROM);
});

test("approve encodes the spender and does not move value", () => {
  const call = buildCall({ kind: "approve", token: "USDC", from: FROM, to: TO, amount: "5", lang: "en" });
  assert.equal(call.data.slice(0, 10), "0x095ea7b3");
  assert.equal(call.amount, 5_000_000n);
});

test("a revert blocks execution and drops the unsigned transaction", () => {
  const decision = decide({ callOk: false, gas: null, gasPriceWei: 10n ** 10n, nativeWei: 10n ** 18n, valueWei: 0n });
  const gated = finish(decision, { from: FROM });
  assert.equal(gated.blocked, true);
  assert.equal(gated.verdict, "revert");
  assert.equal(gated.broadcast, false);
  assert.equal(gated.unsigned, null);
});

test("a successful call with no PROS for gas is blocked", () => {
  const gas = 58353n;
  const price = 10n ** 10n;
  const decision = decide({ callOk: true, gas, gasPriceWei: price, nativeWei: 0n, valueWei: 0n });
  assert.equal(decision.blocked, true);
  assert.equal(decision.verdict, "gas");
  assert.equal(decision.fee, gas * price);
  assert.equal(finish(decision, { from: FROM }).unsigned, null);
});

test("the gas limit sits 20% above the estimate, and the reserve is what must be covered", () => {
  assert.equal(bufferedGas(100_000n), 120_000n);
  const price = 1n;
  const short = decide({ callOk: true, gas: 100_000n, gasPriceWei: price, nativeWei: 110_000n, valueWei: 0n });
  assert.equal(short.fee, 100_000n);
  assert.equal(short.limit, 120_000n);
  assert.equal(short.blocked, true);
  assert.equal(short.verdict, "gas");
  const covered = decide({ callOk: true, gas: 100_000n, gasPriceWei: price, nativeWei: 120_000n, valueWei: 0n });
  assert.equal(covered.blocked, false);
});

test("a successful call that covers the fee stays unsigned and is not broadcast", () => {
  const decision = decide({ callOk: true, gas: 21000n, gasPriceWei: 10n ** 10n, nativeWei: 10n ** 18n, valueWei: 0n });
  const gated = finish(decision, { from: FROM, nonce: 4 });
  assert.equal(gated.blocked, false);
  assert.equal(gated.verdict, "pass");
  assert.equal(gated.broadcast, false);
  assert.equal(gated.unsigned.nonce, 4);
});

test("a balance change carries a signed delta, and a native send credits the recipient", () => {
  const flat = balanceDelta(4n, 4n);
  assert.equal(flat.same, true);
  const up = balanceDelta(1n, 6n);
  assert.equal(up.sign, 1);
  assert.equal(up.abs, 5n);
  const sent = predictBalances({ callOk: true, canPay: true, kind: "native", amount: 5n, fromToken: 0n, toToken: 0n, allowance: 0n, fromNative: 100n, toNative: 2n, value: 5n, fee: 7n });
  assert.equal(sent.fromNative, 88n);
  assert.equal(sent.toNative, 7n);
  const held = predictBalances({ callOk: false, canPay: false, kind: "native", amount: 5n, fromToken: 0n, toToken: 0n, allowance: 0n, fromNative: 100n, toNative: 2n, value: 5n, fee: null });
  assert.equal(held.toNative, 2n);
});

test("balances move only when the transaction would actually be mined", () => {
  const held = predictBalances({ callOk: false, canPay: false, kind: "transfer", amount: 5n, fromToken: 10n, toToken: 1n, allowance: 0n, fromNative: 8n, value: 0n, fee: null });
  assert.equal(held.fromToken, 10n);
  assert.equal(held.toToken, 1n);
  assert.equal(held.mined, false);
  const mined = predictBalances({ callOk: true, canPay: true, kind: "transfer", amount: 5n, fromToken: 10n, toToken: 1n, allowance: 0n, fromNative: 100n, value: 0n, fee: 7n });
  assert.equal(mined.fromToken, 5n);
  assert.equal(mined.toToken, 6n);
  assert.equal(mined.fromNative, 93n);
});

test("bad amount and bad address are refused before any call", () => {
  assert.throws(() => buildCall({ ...SAMPLES.pass, amount: "nope", lang: "en" }), /plain number/);
  assert.throws(() => buildCall({ ...SAMPLES.pass, from: "0x123", lang: "pt" }), /endereço/);
});
