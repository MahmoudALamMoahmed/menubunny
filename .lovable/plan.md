

# Fix: Remove `mode` field from Kashier request

## Problem
Kashier API rejects the request with: `"mode" is not allowed`

The `mode` field we added in the last fix is not accepted by the Kashier sessions API. The test/live mode is determined by the API endpoint URL itself (`test-api.kashier.io` vs `api.kashier.io`), not by a body parameter.

## Fix
In `supabase/functions/create-payment-session/index.ts`, remove the `mode: "test"` line from the `kashierBody` object (line ~137).

After deploying, I will test the wallet top-up flow end-to-end.

## Files Changed
| File | Change |
|---|---|
| `supabase/functions/create-payment-session/index.ts` | Remove `mode: "test"` from kashierBody |

