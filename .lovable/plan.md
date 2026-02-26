
# Fix: Add missing `customer` and `mode` fields to Kashier request

## Problem
Kashier API returns: `"customer" is required`

The `create-payment-session` Edge Function is missing the `customer` object and `mode` field in the request body.

## Fix
In `supabase/functions/create-payment-session/index.ts`, add two fields to the `kashierBody` object:

1. **`customer`** - object with `email` and `reference` (user ID)
   - Get user email from `auth.getUser()` 
   - Use `userId` as the reference

2. **`mode`** - set to `"test"` (required per docs)

### Changes

**File: `supabase/functions/create-payment-session/index.ts`**

1. Replace `getClaims` with `getUser()` to also get the user's email:
```typescript
// Replace getClaims approach with getUser
const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
if (authError || !authUser) { /* return 401 */ }
const userId = authUser.id;
const userEmail = authUser.email || "";
```

2. Add `customer` and `mode` to the Kashier request body:
```typescript
const kashierBody = {
  // ... existing fields ...
  mode: "test",
  customer: {
    email: userEmail,
    reference: userId,
  },
};
```

## Files Changed
| File | Change |
|---|---|
| supabase/functions/create-payment-session/index.ts | Add `customer` object with email/reference + `mode: "test"` + switch from getClaims to getUser |
