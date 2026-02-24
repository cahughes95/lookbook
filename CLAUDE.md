# Lookbook

A mobile-first flea market inventory app for vendors. Vendors photograph their items, browse them in a smooth horizontal carousel ("the rack"), and archive items when they sell.

---

## Core MVP Features

1. **The Rack (Home Page `/`)**
   - Full-screen dark background
   - Horizontal scrolling carousel of item images
   - Smooth scroll transition — like sliding hangers along a clothing rack, NOT a snap/swipe like Tinder
   - Scroll left or right continuously until the last item
   - Floating `+` button (bottom right) to add new items
   - Tap an item to open a detail view with an "Mark as Out of Stock" button

2. **Add Item**
   - Triggered by the `+` button
   - Modal or bottom sheet with two options: **Take Photo** (camera) or **Upload Image**
   - Supports adding multiple images at once
   - Each image becomes its own item card on the rack

3. **Archive Page (`/archive`)**
   - Simple photo grid of all out-of-stock items
   - No interactions needed for MVP — just a visual record

---

## Design

- **Dark background** (`#0a0a0a` or similar near-black)
- **Minimal UI** — photos are the focus, controls stay out of the way
- **Carousel feel**: smooth, continuous horizontal scroll like browsing a clothing rack
- Cards should feel like physical photos — subtle shadow, slight depth
- Mobile-first but should work on desktop too
- Font: clean sans-serif, minimal text on screen at any time

---

## Tech Stack (MVP — easiest/cheapest)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Fast setup, great ecosystem |
| Styling | Tailwind CSS | Utility-first, pairs well with dark UI |
| Animations | Framer Motion | Smooth carousel scroll transitions |
| Backend + Auth + DB | Supabase | Free tier, handles auth, PostgreSQL, and file storage in one place — no separate backend needed for MVP |
| Image Storage | Supabase Storage | Built into Supabase, no extra service needed |
| Deploy | Vercel | Free tier, instant deploys from GitHub |

> No separate backend server needed for MVP — Supabase handles auth, database, and storage directly from the frontend.

---

## Database Schema (Supabase / PostgreSQL)

### `vendors` table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key (auto, from Supabase auth) |
| email | TEXT | From Supabase auth |
| created_at | TIMESTAMP | Auto |

### `items` table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| vendor_id | UUID | Foreign key → vendors.id |
| image_url | TEXT | Supabase Storage public URL |
| status | TEXT | `'in_stock'` or `'archived'` |
| created_at | TIMESTAMP | Auto |
| archived_at | TIMESTAMP | Nullable — set when marked out of stock |

---

## Key UI Components

- `Rack` — the main horizontal scrolling carousel
- `ItemCard` — individual photo card shown on the rack
- `AddItemButton` — floating `+` button
- `AddItemModal` — bottom sheet with camera/upload options
- `ItemDetail` — full view of a single item with "Mark as Out of Stock" action
- `ArchiveGrid` — photo grid on the archive page

---

## App Behavior Rules

- Only `in_stock` items appear on the rack
- Only `archived` items appear on the archive page
- Marking an item out of stock is **irreversible** in MVP (no restore)
- Each uploaded image = one item (no multi-image items for MVP)
- Vendors only see their own items — never other vendors' items
- No item editing in MVP — only add and archive

---

## Conventions

- Use Supabase client directly from frontend (no Express backend for MVP)
- Use Supabase Row Level Security (RLS) to ensure vendors only access their own data
- All Supabase keys go in `.env` — never hardcoded
- Components live in `src/components/`
- Pages live in `src/pages/`
- Supabase client initialized once in `src/lib/supabase.js`
- Keep components small and focused — split if a file exceeds ~150 lines

---

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Session Notes
> At the start of every new session, update this section with any decisions, preferences, or context established during that conversation so future sessions have full continuity.

- **Email confirmation**: disabled in Supabase dashboard — sign up logs in immediately, no email confirmation step
- **Commits**: no `Co-Authored-By` line in commit messages
- **Tailwind v4**: requires `@tailwindcss/vite` plugin in `vite.config.js` — do NOT use PostCSS config approach
- **Git repo**: initialized inside `lookbook/` (not at Desktop level) — remote is `https://github.com/cahughes95/lookbook`
- **Testing on mobile**: run `npm run dev -- --host` to expose on local network, phone accesses via the Network URL shown in terminal

---

## Out of Scope for MVP

- Item titles, descriptions, or prices
- Sharing inventory with customers
- Search or filtering
- Multiple photos per item
- Restoring archived items
- Vendor profiles or settings
- Push notifications
