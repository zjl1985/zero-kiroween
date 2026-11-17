import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSeed } from "../dist/game/seed.js";

test("seed pins preserve decimal uint32 values, including zero and the upper bound", () => {
  for (const [value, expected] of [
    ["0", 0],
    ["1", 1],
    ["7", 7],
    ["0000000000", 0],
    ["0000000007", 7],
    ["2147483648", 2147483648],
    ["4294967294", 4294967294],
    ["4294967295", 4294967295],
  ]) {
    assert.equal(parseSeed(value), expected, value);
  }
});

test("out-of-range seed pins are rejected instead of wrapping", () => {
  for (const value of ["4294967296", "4294967297", "8589934592", "9999999999", "10000000000"]) {
    assert.equal(parseSeed(value), null, value);
  }
});

test("missing or malformed seed pins return null for the caller's random fallback", () => {
  for (const value of [
    null,
    "",
    " ",
    " 7",
    "7 ",
    "\t7",
    "7\n",
    "7\r\n",
    "+7",
    "-7",
    "-0",
    "7.0",
    "1e3",
    "0x10",
    "0b10",
    "0o10",
    "1_000",
    "7abc",
    "NaN",
    "Infinity",
    "７",
    "٧",
    "00000000000",
  ]) {
    assert.equal(parseSeed(value), null, JSON.stringify(value));
  }
});
