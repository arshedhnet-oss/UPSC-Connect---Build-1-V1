

## Fix Mentor Profile Header Layout

This plan addresses alignment issues in the **MentorProfilePage** header where the avatar, AIR badge, name, featured tag, and price appear misaligned — especially for featured mentors / rank holders.

### What Changes

**File: `src/pages/MentorProfilePage.tsx`** (profile header section, lines 198–261)

Restructure the header into a clean, centered vertical layout:

```text
┌──────────────────────────┐
│        [Avatar]          │
│      AIR 234 • 2025      │  ← below avatar, centered, no absolute positioning
│                          │
│  Arshad A  🏷 UPSC Rank  │  ← name + featured badge on same row
│  All India Rank 234 ...  │  ← rank description
│  ₹9/session  ★ 4.5 (12) │  ← price + rating
│  [subjects badges]       │
│  Optional: Public Admin  │
│  ✓ Verified by UPSC...   │
│  [Message Mentor]        │
│  🗣 Hindi, English       │
└──────────────────────────┘
```

Key changes:
1. **Remove `sm:flex-row`** — keep the header as a single centered column (`flex-col items-center text-center`) on all screen sizes for the profile page
2. **Remove absolute positioning** from AirRankLabel — place it as a normal block element below the avatar with `mt-2`, centered
3. **Avatar container**: Remove `relative` positioning, keep avatar + AIR tag as a simple stacked column
4. **Name + badge row**: Keep `flex items-center justify-center gap-2 flex-wrap` so badge sits next to name and wraps gracefully
5. **Consistent spacing**: Use `gap-2` (8px) between micro elements, `gap-3` (12px) between sections

**File: `src/components/AirRankLabel.tsx`**

- Update the `overlay` variant to behave like `inline` but with slightly different styling (or unify into one variant) — remove `absolute`, `-bottom-1`, `left-1/2`, `-translate-x-1/2` positioning
- Both variants render as normal inline-flex elements, centered by the parent

### Technical Details

**MentorProfilePage header rewrite (lines 198–261):**
- Outer wrapper: `flex flex-col items-center text-center gap-3 mb-8`
- Avatar group: `flex flex-col items-center gap-2` containing Avatar + AirRankLabel (no `relative`/`absolute`)
- Info group: `flex flex-col items-center gap-1.5` containing name row, rank text, price row, subjects, optional, verified badge, message button, languages

**AirRankLabel.tsx:**
- Remove all absolute positioning from `overlay` variant
- Make it identical to `inline` but keep the slightly smaller `text-[10px]` size for the overlay use case
- Parent controls centering via flexbox

### No Database Changes Required

