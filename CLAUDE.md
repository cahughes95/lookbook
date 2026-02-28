# Lookbook

A mobile-first flea market inventory app for vendors. Vendors photograph their items, browse them in a smooth horizontal carousel ("the rack"), and manage their inventory with product details, collections, and AI-assisted listing creation.

---

## Core Features

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

2. **Add Item (2-step flow)**
   - Triggered by the `+` button
   - **Step 1**: Bottom sheet with two options: Take Photo (camera) or Upload Image
   - **Step 2**: Product form appears after upload with:
     - Photo preview
     - Collection picker (select existing or create new inline)
     - AI-prefilled name and description (shimmer while Groq analyzes)
     - Size, price, quantity fields
     - Per-field visibility toggles (vendor controls what buyers see)
   - Saves to: `items`, `item_photos`, `item_visibility_settings`, `item_ai_suggestions`

3. **Archive Page (`/archive`)**
   - Simple photo grid of all archived/sold items
   - No interactions needed beyond viewing

---

## Design

- **Dark background** (`#141414` or `#0a0a0a`)
- **Minimal UI** — photos are the focus, controls stay out of the way
- Font: clean sans-serif, minimal text on screen at any time
- Mobile-first but must work on desktop too
- All text uses `tracking-[0.15em]` or wider — spaced lettering throughout
- Subtle `white/5`, `white/10`, `white/30` layering for UI elements
- Inputs: `bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70`
- Buttons (primary): `bg-white/90 text-[#141414]`
- Buttons (secondary): `bg-white/5 border border-white/10 text-white/80`

### Carousel Visual Behavior
- 3 cards visible at once — center fully in view, side cards partially cropped
- Center card: full color, full size, slight drop shadow
- Side cards: scaled ~85%, partially hidden behind center
- Drag transition: cards scale in real time based on distance from center
- Momentum scrolling: velocity determines travel — flicks advance 2-3 cards max
- No hard snap — settle feels physical and weighted
- Card proportions: portrait orientation (~3:4 ratio)

### Desktop Layout
- Center card height ~70-75vh
- Side cards peek in generously

### Mobile Layout
- Images immediately below header — minimal gap, no vertical centering
- Do NOT use `height: 100vh` with `items-center` or `justify-center` on carousel wrapper
- Center card ~75% of screen width, side cards peek ~10-15%

### Mobile Touch & Scroll Behavior
- Direct 1:1 finger tracking — zero delay
- Do NOT use CSS `overflow-x: scroll`
- Use pointer/touch events with Framer Motion's `drag` prop
- No snapping while dragging
- Progressive deceleration after release — low friction, high inertia
- Flick velocity multiplier tuned low — 2-3 cards max per flick

### Grid View
- Toggled from carousel via view switcher (top right)
- Carousel is default on every page load
- 2 columns mobile, 3-4 desktop
- Tapping opens same item detail view

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Backend + Auth + DB | Supabase |
| Image Storage | Supabase Storage (`item-images` bucket, public) |
| AI Suggestions | Groq API — `meta-llama/llama-4-scout-17b-16e-instruct` |
| AI Proxy | Supabase Edge Function (`groq-suggest`) |
| Deploy | Vercel |

---

## Project Structure

```
lookbook/
├── supabase/
│   └── functions/
│       └── groq-suggest/
│           └── index.ts        ← Groq vision proxy Edge Function
├── src/
│   ├── components/
│   │   ├── AddItemButton.jsx
│   │   ├── AddItemModal.jsx    ← 2-step upload + AI form
│   │   ├── ArchiveGrid.jsx
│   │   ├── AuthGuard.jsx
│   │   ├── ItemCard.jsx
│   │   ├── ItemDetail.jsx
│   │   ├── Rack.jsx
│   │   ├── RackGrid.jsx
│   │   └── ViewToggle.jsx
│   ├── pages/
│   │   ├── Archive.jsx
│   │   ├── Home.jsx
│   │   └── Login.jsx
│   ├── lib/
│   │   └── supabase.js         ← createClient, uses VITE_ env vars
│   ├── types/
│   │   ├── database.ts         ← generated, DO NOT edit manually
│   │   └── index.ts            ← helper types (Item, Collection, etc.)
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
```

---

## Database Schema (Supabase / PostgreSQL)

### `items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vendor_id | uuid | FK → auth.users |
| collection_id | uuid | FK → collections (nullable) |
| image_url | text | Legacy primary image URL (keep, don't remove) |
| name | text | Nullable |
| description | text | Nullable |
| size | text | Nullable |
| price | numeric(10,2) | Nullable |
| quantity_available | integer | Default 1 |
| status | text | `'active'` \| `'sold'` \| `'archived'` |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto (trigger) |
| archived_at | timestamptz | Nullable |

### `collections`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vendor_id | uuid | FK → auth.users |
| name | text | Required |
| description | text | Nullable |
| is_featured | boolean | Default false |
| is_published | boolean | Default false |
| collection_number | integer | Nullable (e.g. "Drop #12") |
| published_at | timestamptz | Nullable |
| created_at / updated_at | timestamptz | Auto |

### `item_photos`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| storage_path | text | Path in `item-images` bucket |
| is_primary | boolean | Only one true per item (unique partial index) |
| sort_order | integer | Default 0 |
| ai_analyzed | boolean | Whether Groq has analyzed this photo |
| created_at | timestamptz | Auto |

### `item_visibility_settings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items (unique) |
| show_name | boolean | Default true |
| show_description | boolean | Default true |
| show_size | boolean | Default true |
| show_price | boolean | Default true |
| show_quantity | boolean | Default false |

### `item_saves`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| user_id | uuid | FK → auth.users |
| saved_at | timestamptz | Auto |

### `item_views`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| user_id | uuid | Nullable (anonymous allowed) |
| session_id | text | For deduplication |
| viewed_at | timestamptz | Auto |

### `item_comments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| user_id | uuid | FK → auth.users |
| body | text | Required |
| vendor_reaction | text | Emoji reaction from vendor |
| created_at | timestamptz | Auto |

### `item_ai_suggestions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| photo_id | uuid | FK → item_photos |
| suggested_name | text | What Groq suggested |
| suggested_description | text | What Groq suggested |
| suggested_size | text | What Groq suggested |
| accepted_name | boolean | Did vendor keep the suggestion? |
| accepted_description | boolean | Did vendor keep the suggestion? |
| created_at | timestamptz | Auto |

---

## Storage

- **Bucket**: `item-images` (public)
- **Path pattern**: `{user_id}/{timestamp}-{random}.{ext}`
- **Policies**: public read, authenticated upload/delete/update scoped to own folder

---

## Edge Functions

### `groq-suggest`
- **Location**: `supabase/functions/groq-suggest/index.ts`
- **Purpose**: Proxies image + prompt to Groq API, returns `{ name, description, suggested_size }`
- **Model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Secret**: `GROQ_API_KEY` set via `supabase secrets set`
- **Called from**: `AddItemModal.jsx` after photo upload, using user's JWT for auth
- **Deploy**: `supabase functions deploy groq-suggest --project-ref luykttcdfnvfvlktvlhh`

---

## TypeScript Types

```typescript
// src/types/index.ts — import these throughout the app
import type { Tables, TablesInsert, TablesUpdate } from './database'

export type Item = Tables<'items'>
export type Collection = Tables<'collections'>
export type ItemPhoto = Tables<'item_photos'>
export type ItemVisibilitySettings = Tables<'item_visibility_settings'>
export type ItemSave = Tables<'item_saves'>
export type ItemView = Tables<'item_views'>
export type ItemComment = Tables<'item_comments'>
export type ItemAiSuggestion = Tables<'item_ai_suggestions'>
export type NewItem = TablesInsert<'items'>
export type NewCollection = TablesInsert<'collections'>
export type NewItemPhoto = TablesInsert<'item_photos'>
export type AiSuggestion = {
  name: string
  description: string
  suggested_size: string | null
}
```

Regenerate types after any schema change:
```bash
supabase gen types typescript --project-id luykttcdfnvfvlktvlhh > src/types/database.ts
```

---

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never hardcode these. Edge Function secrets are managed via Supabase dashboard or CLI.

---

## Common Commands

```bash
npm run dev                          # local dev server
npm run dev -- --host                # expose on local network for mobile testing
supabase functions deploy groq-suggest --project-ref luykttcdfnvfvlktvlhh
supabase secrets set GROQ_API_KEY=... --project-ref luykttcdfnvfvlktvlhh
supabase gen types typescript --project-id luykttcdfnvfvlktvlhh > src/types/database.ts
```

---

## App Behavior Rules

- Only `active` items appear on the rack and grid view (previously `in_stock` — migrated)
- Only `archived` items appear on the archive page
- Vendors only see their own items — RLS enforced at DB level
- `image_url` on `items` is legacy — new items also write to `item_photos` (keep both for now)
- Visibility toggles on `item_visibility_settings` control what buyers see — enforced at app layer, not DB
- AI suggestions are non-blocking — form is usable immediately, fields populate when Groq responds
- Collection is required when creating an item — vendor must select or create one

---

## Conventions

- Use Supabase client directly from frontend — no Express backend
- RLS handles all data access scoping
- Components in `src/components/`, pages in `src/pages/`
- Supabase client initialized once in `src/lib/supabase.js`
- Keep components under ~150 lines — split if larger
- No `Co-Authored-By` lines in commit messages
- Tailwind v4 — uses `@tailwindcss/vite` plugin in `vite.config.js`, NOT PostCSS config

---

## Session Notes

- **Email confirmation**: disabled in Supabase — sign up logs in immediately
- **Git repo**: `https://github.com/cahughes95/lookbook`, initialized inside `lookbook/`
- **Mobile testing**: `npm run dev -- --host`, access via Network URL on phone
- **Tailwind v4**: `@tailwindcss/vite` plugin only — no PostCSS
- **Carousel flick velocity**: tuned low — 2-3 cards max per flick
- **Mobile snap**: NO snap-to-center — cards coast to free stop, no post-release centering
- **Mobile deceleration**: gradual and progressive — low friction, high inertia
- **Status migration**: `in_stock` → `active` (ran in v2 migration, check constraint updated)
- **Supabase project ref**: `luykttcdfnvfvlktvlhh`
- **AddItemModal**: now a 2-step flow — photo pick → product form with AI suggestions
- **Groq model**: `meta-llama/llama-4-scout-17b-16e-instruct` via `groq-suggest` Edge Function
- **item_photos**: new table for multi-photo support; `image_url` on items kept for legacy compatibility
- **Collections**: required on item creation; empty on first use — inline creation available in modal
- **ItemDetail**: archive errors are handled and surfaced to user; exit animation uses `opacity: 0` with `duration: 0.2`; image container has fixed `minHeight: 50vh` / `maxHeight: 65vh` to prevent layout shift; `quantity_available` null-checks use `!= null` not falsy
- **AddItemModal**: AI requests use AbortController via `aiAbortRef`; back button aborts in-flight Groq request and resets form cleanly; collection validation error is context-aware; dead state variables removed