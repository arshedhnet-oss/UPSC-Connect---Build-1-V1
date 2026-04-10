
Goal: make app emails reliable for every slot-request stage so the correct mentor, mentee, and admin recipient gets notified every time.

What I found
- Your sender domain is verified, and other app emails are sending successfully. So this is not a domain/infrastructure problem.
- The slot-request flow is the weak point: the database shows accepted/rejected slot requests and in-app notifications, but almost no corresponding slot-request email logs.
- The main issue is likely silent failure handling:
  - `handle-slot-request` catches email errors and hides them instead of surfacing/logging them properly.
  - `RequestSlotModal` does not verify that the `payment_confirmed` step actually succeeded before showing success to the user.
  - There are multiple `booking_requests` still stuck in `pending_payment`, which strongly suggests the paid flow can complete payment but fail to finish the server-side notification step.
- Result: users think the request succeeded, but the stage-processing code may not finish, so the emails for mentor/mentee/admin never get queued.

Implementation plan

1. Harden the slot-request backend flow
- Refactor the slot lifecycle logic in `handle-slot-request` so each stage is processed in a strict sequence:
  - validate request + actor
  - update booking status
  - create in-app notifications
  - send stage-specific emails
  - return a structured success/failure response
- Replace the current “swallow errors” email helper with one that:
  - checks the result of `send-transactional-email`
  - logs recipient/template/stage/request id clearly
  - returns failure details instead of silently continuing

2. Fix the paid slot-request completion path
- Update `RequestSlotModal.tsx` so the Razorpay success callback:
  - checks whether `payment_id` was saved successfully
  - checks whether `handle-slot-request` returned success
  - only shows “Request submitted” after the backend confirms the stage was processed
- If backend finalization fails, show an explicit error instead of pretending the request was submitted.

3. Add a server-side fallback for paid requests
- Extend the payment webhook flow so paid slot requests can still be finalized even if the browser callback fails or the user closes the payment window.
- Best approach: let the webhook recognize `booking_requests` by `razorpay_order_id` and trigger the same idempotent “payment confirmed” processing used by `handle-slot-request`.
- This removes the browser as the single point of failure.

4. Verify every required email stage and recipient
- New slot request:
  - mentor
  - mentee confirmation
  - admin at `admin@upscconnect.in`
- Accepted:
  - mentee accepted email
  - mentor meeting-confirmation email
  - admin accepted alert
- Rejected:
  - mentee rejected email
  - admin rejected alert
- Expired:
  - mentee expiry/refund email
  - admin expiry alert
- Keep mentor messages included when available, and omit empty message sections.

5. Verify expiry automation too
- Re-check `expire-slot-requests` so it uses the same reliable email result handling and logging.
- Confirm it updates status, sends in-app notifications, and queues emails for mentee + admin consistently.

6. Add better troubleshooting visibility
- Improve logs in the slot-request edge functions so failures are easy to diagnose by:
  - request id
  - stage
  - template name
  - recipient
  - backend error message
- This will make future issues obvious instead of silent.

7. Recover existing broken states
- Review existing `pending_payment` slot requests and identify which ones are genuinely abandoned vs. paid-but-not-finalized.
- For any paid requests that were never finalized, run a safe recovery path so status + notifications + emails are corrected.

Files likely to change
- `supabase/functions/handle-slot-request/index.ts`
- `supabase/functions/expire-slot-requests/index.ts`
- `supabase/functions/razorpay-webhook/index.ts`
- `src/components/RequestSlotModal.tsx`

Technical details
- No major database schema change is required for the email fix itself.
- The key fix is reliability/idempotency in the slot-request payment-to-notification pipeline.
- I’ll preserve the current hardcoded admin recipient: `admin@upscconnect.in`.
- After implementation, I’ll verify both:
  1. inbox delivery for mentor/mentee/admin
  2. backend send records in `email_send_log`

Expected outcome
- Every slot-request stage reliably triggers the correct app emails.
- Paid requests no longer get stuck silently in `pending_payment`.
- Mentor, mentee, and admin all receive the right messages at the right stage.
- Future failures become visible and traceable instead of silent.
