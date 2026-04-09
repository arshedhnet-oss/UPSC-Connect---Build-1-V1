## Phase 1: Request a Slot — Core Flow

### Database Changes

1. **Create `booking_requests` table** with columns:
   - `id` (uuid, PK)
   - `mentor_id` (uuid, references profiles)
   - `mentee_id` (uuid, references profiles)
   - `requested_date` (date)
   - `requested_start_time` (time)
   - `requested_end_time` (time)
   - `message` (text, optional)
   - `status` (text: `pending_payment`, `pending_mentor_confirmation`, `accepted`, `rejected`, `expired_refunded`)
   - `payment_id` (text, nullable — Razorpay payment ID)
   - `razorpay_order_id` (text, nullable)
   - `meeting_link` (text, nullable)
   - `meeting_passcode` (text, nullable)
   - `expires_at` (timestamptz, nullable — set to now+4h after payment)
   - `created_at` (timestamptz, default now())
   - RLS: mentee can insert (own), mentee+mentor+admin can select, mentor+admin can update

2. **Create `notifications` table** for in-app notifications:
   - `id`, `user_id`, `type`, `title`, `message`, `is_read` (default false), `metadata` (jsonb), `created_at`
   - Enable realtime
   - RLS: users can read/update own notifications

### UI Changes

3. **MentorProfilePage**: When no slots available, show "Request a Slot" button that opens a modal with:
   - Date picker
   - Time range selector (start/end)
   - Optional message textarea
   - Submit → creates Razorpay order → payment → creates booking_request with status `pending_mentor_confirmation`

4. **Create `RequestSlotModal` component**

### Edge Functions

5. **`create-slot-request-order`** — Creates Razorpay order for slot request (similar to existing `create-razorpay-order`)

6. **`handle-slot-request-payment`** — After payment success: updates booking_request status, sets expires_at, notifies mentor

### Mentor Side

7. **Mentor Dashboard** — Show pending slot requests with Accept/Reject buttons
   - Accept: generate meeting link, update status to `accepted`
   - Reject: trigger refund, update status to `rejected`

### Phase 2 (next): Email notifications, admin notifications, expiry cron job, refund edge function
### Phase 3 (next): Admin dashboard tab, countdown timers, UX polish
