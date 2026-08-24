import assert from "node:assert/strict";
import { advanceRateLimit, type RateEntry } from "../lib/ip-rate-limit.ts";

const limit = 3;
const windowSeconds = 24 * 60 * 60;
const start = Date.UTC(2026, 7, 24, 12, 0, 0);
let entry: RateEntry | undefined;

for (let attempt = 1; attempt <= limit; attempt += 1) {
  const advanced = advanceRateLimit(entry, start + attempt, limit, windowSeconds);
  entry = advanced.entry;
  assert.equal(advanced.result.limited, false, `Attempt ${attempt} must be allowed.`);
  assert.equal(advanced.result.remaining, limit - attempt);
}

const blocked = advanceRateLimit(entry, start + 10_000, limit, windowSeconds);
assert.equal(blocked.result.limited, true, "The fourth attempt inside 24 hours must be blocked.");
assert.equal(blocked.result.remaining, 0);

const reset = advanceRateLimit(entry, start + windowSeconds * 1000 + 1, limit, windowSeconds);
assert.equal(reset.result.limited, false, "A new attempt must be allowed after the 24-hour window.");
assert.equal(reset.entry.count, 1);
assert.equal(reset.result.remaining, 2);

console.log("Mosaipix: the IP budget allows 3 image generations per 24 hours and blocks the fourth.");
