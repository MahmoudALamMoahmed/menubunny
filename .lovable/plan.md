

# Switch Kashier from Test to Production

## Change
Update the Kashier API endpoint URL from `test-api.kashier.io` to `api.kashier.io` in the `create-payment-session` Edge Function.

## File Changed
| File | Change |
|---|---|
| `supabase/functions/create-payment-session/index.ts` (line 145) | Change `https://test-api.kashier.io/v3/payment/sessions` to `https://api.kashier.io/v3/payment/sessions` |

## Important Note
Make sure your Kashier secrets (`KASHIER_API_KEY`, `KASHIER_SECRET_KEY`, `KASHIER_MERCHANT_ID`) are updated with the **production** credentials if they differ from the test ones. If Kashier gave you new keys for production, let me know and we'll update them.

