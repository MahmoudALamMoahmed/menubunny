
# Fix: merchantRedirect URL encoding issue

## Problem
The `create-payment-session` Edge Function is failing with:
```
"merchantRedirect" must be a valid URL
```

The cause is `encodeURIComponent()` wrapping the entire redirect URL, converting it from a valid URL like `https://menubunny.lovable.app/username/wallet?payment=done` into an encoded string like `https%3A%2F%2Fmenubunny...` which Kashier rejects.

## Fix
In `supabase/functions/create-payment-session/index.ts`, remove the `encodeURIComponent` call:

```typescript
// Before (broken):
const merchantRedirect = encodeURIComponent(`${appUrl}${redirectPath}`);

// After (fixed):
const merchantRedirect = `${appUrl}${redirectPath}`;
```

This is a one-line fix. After deploying, I'll test the wallet top-up flow end-to-end.

## Files Changed
| File | Change |
|---|---|
| supabase/functions/create-payment-session/index.ts | Remove `encodeURIComponent` from merchantRedirect |
