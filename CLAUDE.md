# Lookbook

A mobile-first flea market inventory app for vendors. Vendors photograph their items, browse them in a smooth horizontal carousel ("the rack"), and archive items when they sell.

---

## Core MVP Features

1. **The Rack (Home Page `/`)**
   - Full-screen dark background
   - Horizontal drag/scroll carousel — 3 cards visible at once (center + two partial side cards)
   - Center card is full color, full size, and in focus
   - Side cards are full color, slightly smaller, and partially cropped — creating a 3D depth effect
   - As you drag, the scale transition happens fluidly in real time (not just on snap)
   - Velocity-based momentum — a slow drag moves cards freely, a fast flick advances 2-3 cards max
   - Cards coast to a natural stop based on momentum only — no automatic snapping or settling to center
   - Centering is not forced — if the user stops mid-drag between two cards, it stays there
   - Scroll/drag continues until the last item (no looping)
   - Floating `+` button (bottom right) to add new items
   - Tap the center card to open a detail view with a "Mark as Out of Stock" button
   - **View toggle** (top right): switch between **Carousel** (default) and **Grid** view
   - "Scroll or drag" hint text shown subtly at bottom right on first load

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
- Font: clean sans-serif, minimal text on screen at any time
- Mobile-first but must work on desktop too — same interaction, different scale

### Carousel Visual Behavior (reference: Felix Koenig portfolio style)
- **3 cards visible at once** — center card fully in view, left/right cards partially cropped
- **Center card**: full color, full size, slight drop shadow for depth
- **Side cards**: full color, scaled down ~85%, partially hidden behind center
- **Drag transition**: as the user drags, cards scale smoothly in real time based on their distance from center
- **Momentum scrolling**: drag velocity determines how far it travels — flicks advance 2-3 cards max, velocity multiplier should be kept low
- **Settle animation**: after release, cards glide smoothly to rest on the nearest card (spring physics, not linear ease)
- **Card proportions**: portrait orientation (roughly 3:4 ratio), tall cards like photos
- **Overlap**: side cards overlap slightly behind the center card (use z-index + scale)
- **No hard snap** — the settle should feel physical and weighted, not mechanical

### Desktop Layout
- Cards should be **large** — center card should take up a significant portion of the viewport height
- Aim for center card height ~70-75vh on desktop
- Side cards peek in generously, not just slivers

### Mobile Layout
- Images should sit **immediately below the header** — minimal gap, no vertical centering
- The carousel container must be top-aligned, not vertically centered in the viewport
- Do not use `height: 100vh` with `items-center` or `justify-center` on the carousel wrapper — this pushes content down
- Center card takes up ~75% of screen width
- Side cards peek in from edges (~10-15% visible)

### Mobile Touch & Scroll Behavior
- **Direct 1:1 finger tracking** — cards move exactly with the thumb in real time, zero delay
- Feels like physically pushing items along a rack — slow deliberate drag moves cards freely
- **Do NOT use CSS `overflow-x: scroll`** — this causes browser-controlled snappiness
- Use **pointer events or touch events directly** on the drag container with Framer Motion's `drag` prop
- No snapping or magnetic pulling to center while actively dragging
- After finger release, cards must **gradually decelerate** with a smooth easing curve — like gliding on a smooth surface that slowly loses momentum
- Deceleration must be progressive, not sudden or abrupt — the card should visibly slow down over time before stopping
- Use low friction / high inertia settings so momentum carries naturally before fading out
- Do not cut momentum short — let the full deceleration curve play out
- Do not use snapToCenter, snap points, or any post-release centering logic on mobile
- **Flick velocity multiplier must be tuned low** — a flick should advance 2-3 cards max, not fly to the end
- Touch events must feel as responsive as mouse drag

### Grid View
- Toggled from the carousel via a view switcher (carousel icon / grid icon) in the top right
- Carousel is the **default** view on every page load
- Grid shows all in-stock items in a clean photo grid (2 columns on mobile, 3-4 on desktop)
- Same dark background, minimal padding between grid items
- Tapping a grid item opens the same item detail view as the carousel
- View preference does not need to persist between sessions

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
- `RackGrid` — grid view of in-stock items (toggled from carousel)
- `ViewToggle` — switcher between carousel and grid view (default: carousel)
- `ItemCard` — individual photo card shown on the rack or grid
- `AddItemButton` — floating `+` button
- `AddItemModal` — bottom sheet with camera/upload options
- `ItemDetail` — full view of a single item with "Mark as Out of Stock" action
- `ArchiveGrid` — photo grid on the archive page

---

## App Behavior Rules

- Only `in_stock` items appear on the rack and grid view
- Only `archived` items appear on the archive page
- Marking an item out of stock is **irreversible** in MVP (no restore)
- Each uploaded image = one item (no multi-image items for MVP)
- Vendors only see their own items — never other vendors' items
- No item editing in MVP — only add and archive
- View preference (carousel vs grid) always defaults to carousel on load

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
- **Carousel flick velocity**: multiplier must be tuned low — a flick should advance 2-3 cards max, never fly to the end
- **Mobile snap behavior**: NO snap-to-center on mobile — cards coast to a free stop based on momentum only, no post-release centering
- **Mobile deceleration**: must be gradual and progressive — low friction, high inertia — cards visibly slow down over time, never cut off abruptly

---

## Out of Scope for MVP

- Item titles, descriptions, or prices
- Sharing inventory with customers
- Search or filtering
- Multiple photos per item
- Restoring archived items
- Vendor profiles or settings
- Push notifications