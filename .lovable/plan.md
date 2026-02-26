

# Fix: Card payment failures in Kashier test mode

## Root Cause Analysis

Two issues identified:

### 1. `paymentType: "credit"` conflicts with `allowedMethods`
The request body sends both `paymentType: "credit"` (which forces credit card mode) and `allowedMethods: "card,wallet,bnpl"`. Per Kashier's sessions API, when using `allowedMethods`, `paymentType` should be removed to let the payment page show all methods properly.

### 2. Test card expiry dates may be outdated
Kashier's test documentation shows that expiry date `06/25` returns APPROVED, but this date is now in the past (Feb 2026). The "use test data" button on Kashier's checkout may be auto-filling with dates that result in DECLINED responses. This is a Kashier-side limitation, not a code issue.

## Fix

**File: `supabase/functions/create-payment-session/index.ts`**

Remove the `paymentType: "credit"` field from the `kashierBody` object. The `allowedMethods: "card,wallet,bnpl"` field already controls which payment methods are available.

```typescript
// Remove this line:
paymentType: "credit",

// Keep this line (already handles method selection):
allowedMethods: "card,wallet,bnpl",
```

## Note for the user
If card payments still fail after this fix, the issue is likely Kashier's test card expiry dates being in the past. You may need to:
- Contact Kashier support to get updated test card details
- Or switch to live mode with real cards

## Files Changed
| File | Change |
|---|---|
| `supabase/functions/create-payment-session/index.ts` | Remove `paymentType: "credit"` from kashierBody |

