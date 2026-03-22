

## Plan: Fix Slot Booking Visual Glitch and Ghost Selection

### Problem 1: All slots appear disabled during booking
When a mentee clicks "Book" on one slot, the `booking` boolean state disables **every** slot's button and shows "Booking..." on all of them. This makes it look like all slots are being booked.

**Fix**: Track the specific slot ID being booked instead of a generic boolean. Only the clicked slot's button will show "Booking..." and be disabled; other slots remain interactive.

**File**: `src/pages/MentorProfilePage.tsx`
- Change `booking` state from `boolean` to `string | null` (stores the slot ID being booked)
- Update `handleBook` to set `setBooking(slot.id)` and clear to `null` in `finally`
- Update the button: `disabled={booking === slot.id}` and text `{booking === slot.id ? "Booking..." : "Book"}`

### Problem 2: Orange/yellow ghost selection highlight
The accent color (`hsl(32 90% 55%)`) causes an orange tap-highlight and text-selection color on mobile and desktop interactions.

**Fix**: Add CSS rules to suppress unwanted selection highlights.

**File**: `src/index.css`
- Add `-webkit-tap-highlight-color: transparent` to suppress mobile tap highlight
- Add `::selection` styles with a neutral color instead of the browser default (which may pick up the accent)
- Add `user-select: none` on interactive elements like buttons and cards if needed

### Summary of changes
| File | Change |
|---|---|
| `src/pages/MentorProfilePage.tsx` | Track booking by slot ID instead of boolean |
| `src/index.css` | Suppress tap highlight and fix selection color |

