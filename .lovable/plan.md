

# Admin-Controlled Mentor Positioning

## Overview
Add a `display_priority` integer field to `mentor_profiles` so admins can control the order mentors appear in search results. Higher priority = shown first. Sorting happens at the database query level for performance.

## Changes

### 1. Database Migration
- Add column `display_priority integer NOT NULL DEFAULT 0` to `mentor_profiles`
- Create an index on `(is_approved, display_priority DESC)` for fast sorted queries

### 2. Mentor Listing Page (`src/pages/MentorListingPage.tsx`)
- Add `display_priority` to the SELECT query
- Add `.order("display_priority", { ascending: false })` to the database query so sorting happens server-side
- Update the client-side sort in the `filtered` useMemo to use `display_priority` as primary sort (descending), then `is_featured` as secondary

### 3. Admin Dashboard — Priority Controls (`src/pages/AdminDashboardPage.tsx`)
- In the "Active Mentors" section, display the current priority value for each mentor
- Add a priority control inline with each mentor: a number input plus quick-preset buttons (High: 100, Medium: 50, Normal: 0)
- Save priority changes to `mentor_profiles.display_priority` via Supabase update
- Sort the approved mentors list in admin view by priority descending so admins can see the current ordering
- Include `display_priority` in the existing `approvedRes` SELECT query

### 4. FeaturedMentorControls Update (`src/components/FeaturedMentorControls.tsx`)
- When toggling "Feature" ON, auto-set `display_priority` to 100 if it's currently 0
- When toggling "Feature" OFF, reset `display_priority` to 0

### Technical Details
- **Query-level sorting**: The `.order("display_priority", { ascending: false })` call ensures the database handles sorting, not the frontend
- **Index**: `CREATE INDEX idx_mentor_priority ON mentor_profiles (is_approved, display_priority DESC)` for efficient retrieval
- **No RLS changes needed**: Existing admin update policy on `mentor_profiles` already covers this field
- **No frontend visibility**: Regular users see no priority indicator; mentors simply appear in the admin-controlled order

