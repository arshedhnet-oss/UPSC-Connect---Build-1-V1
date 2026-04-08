## Database Trigger: Auto-sync role on mentor approval

Create a trigger on `mentor_profiles` that fires on UPDATE. When `is_approved` changes to `true`:
1. Update `profiles.role` to `'mentor'` for that `user_id`
2. Upsert `user_roles` to `'mentor'` for that `user_id`

This prevents future role mismatches automatically.