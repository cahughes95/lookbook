# Lookbook

A mobile-first flea market inventory app for vendors. Vendors photograph their items, browse them in a smooth horizontal carousel ("the rack"), and manage their inventory with product details, collections, and AI-assisted listing creation. Buyers can browse public vendor pages, follow vendors, save items, and DM vendors about specific items.

---

## Product Vision

- **Vendors**: Invite-only. Must be approved to list. Real flea market vendors only — quality controlled via invite codes.
- **Buyers**: Anyone can browse publicly. Sign up (email only, no verification) to follow vendors or save items.
- **One account type**: Everyone has a profile. Vendors have an additional `vendors` row. A vendor can also browse and follow other vendors using the same account.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/` | Vendor only (AuthGuard) | Vendor's own rack view — browse mode, no upload |
| `/manage` | Vendor only (AuthGuard) | Upload + manage items — work mode |
| `/inbox` | Vendor only | Messages by item — NOT YET BUILT |
| `/archive` | Vendor only (AuthGuard) | Vendor's archived/sold items |
| `/login` | Public | Full page login — vendor routes only |
| `/messages` | Buyer auth (BuyerAuthGuard) | Buyer message threads |
| `/v/:handle` | Public | Public vendor profile + rack ✅ |
| `/v/:handle/collection/:id` | Public | Public collection with filters — NOT YET BUILT |

---

## Core Features

### 1. The Rack (`/`)
- Full-screen dark background (`#0a0a0a`)
- Horizontal drag/scroll carousel — 3 cards visible at once (center + two partial side cards)
- Center card: full color, full size, slight drop shadow
- Side cards: grayscale, scaled ~85%, partially cropped — 3D depth effect
- Drag transition: grayscale/size transitions happen in real time during drag (not just on snap)
- Velocity-based momentum — slow drag moves one card, fast flick skips multiple
- Cards settle smoothly on nearest card after release — glides to stop, no hard snap
- Keyboard navigation: arrow keys
- Pill dot indicators below carousel
- View toggle (top right): Carousel (default) ↔ Grid
- Floating `+` button (bottom right) → opens AddItemModal
- Tap center card → opens ItemDetail

### 2. Add Item (`/manage` or `+` button)
- 2-step flow: photo pick → product form
- **Step 1**: Bottom sheet — Take Photo or Upload Image
- **Step 2**: Product form with:
  - Photo preview
  - Collection picker (select or create inline)
  - AI-prefilled fields (shimmer while Groq analyzes)
  - Core fields always shown: name, description, size, price, category
  - Optional fields shown based on `vendor_feature_flags`: tags, brand, era, condition, color, material, measurements
  - Per-field visibility toggles (controls what buyers see)
- Saves to: `items`, `item_photos`, `item_visibility_settings`, `item_ai_suggestions`

### 3. Archive (`/archive`)
- Photo grid of all archived/sold items
- Vendor-only view

### 4. Public Vendor Page (`/v/:handle`) ✅ BUILT
- No auth required — fully public
- Shows vendor's active rack (reuses Rack + RackGrid components)
- Vendor bio, instagram, markets
- Follow button — triggers AuthModal if anonymous, completes follow on success
- Category pill filters — horizontally scrollable on mobile
- Tapping item → opens BuyerItemDetail

### 5. Public Collection Page (`/v/:handle/collection/:id`)
- No auth required
- Category pill filters at top
- Items grouped by category
- Search bar (text search across name + description + tags)
- Item cards → buyer item detail view
- **NOT YET BUILT**

### 6. Buyer Item Detail ✅ BUILT
- Separate from vendor-side ItemDetail.jsx
- Respects `item_visibility_settings` — only shows fields vendor has enabled
- Save button — triggers AuthModal if anonymous, saves on success
- DM button — triggers AuthModal if anonymous, sends message on success
- Inline message thread shown if buyer has already messaged about this item
- Interest counter: saves_count · dms_count shown subtly
- ⚠️ Desktop item click not opening BuyerItemDetail — fix in progress

### 7. Buyer Messages (`/messages`) ✅ BUILT
- Facebook Marketplace-style thread list
- Threads grouped by item — shows item photo, vendor name, last message, timestamp
- Tapping thread expands inline with full message history + follow-up input
- Requires auth — BuyerAuthGuard shows AuthModal if not logged in

### 8. AuthModal ✅ BUILT
- Reusable popup component — NOT a full page redirect
- Bottom sheet on mobile, centered card on desktop
- Slides up from bottom on mobile, accounts for keyboard height via visualViewport API
- Toggle between sign in / sign up
- `onSuccess(user)` callback fires after auth — parent completes the original action
- Used for: save item, follow vendor, DM vendor, access /messages
- Vendor routes (/, /manage, /archive) still use AuthGuard → /login full page redirect

### 9. Messaging
- DMs scoped per item — not a general inbox
- Vendor inbox at `/inbox` — **NOT YET BUILT** (placeholder route only)
- `dms_count` on item increments on first message per unique sender via trigger

---

## Design System

- **Background**: `#0a0a0a` or `#141414`
- **Minimal UI** — photos are the focus
- **Typography**: clean sans-serif, `tracking-[0.15em]` or wider throughout
- **UI layering**: `white/5`, `white/10`, `white/30` for surfaces and borders
- **Inputs**: `bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70`
- **Primary button**: `bg-white/90 text-[#141414]`
- **Secondary button**: `bg-white/5 border border-white/10 text-white/80`
- Mobile-first, works on desktop at same interaction model, different scale

### Carousel Specifics
- Card proportions: portrait ~3:4 ratio
- Desktop: center card ~70-75vh height
- Mobile: center card ~75% screen width, side cards peek ~10-15%
- Do NOT use CSS `overflow-x: scroll` — use pointer/touch events with Framer Motion
- No centering with `items-center` / `justify-center` on carousel wrapper
- Framer Motion spring: `stiffness: 120, damping: 18, mass: 1.2`
- Mobile deceleration: `ease: [0.15, 0, 0, 1], duration` scales with velocity

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin, NOT PostCSS) |
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
│   ├── functions/
│   │   └── groq-suggest/
│   │       └── index.ts          ← Groq vision proxy
│   └── schema.sql                ← Full v2 schema
├── src/
│   ├── components/
│   │   ├── AddItemButton.jsx
│   │   ├── AddItemModal.jsx      ← 2-step upload + AI form (v2)
│   │   ├── ArchiveGrid.jsx
│   │   ├── AuthGuard.jsx
│   │   ├── ItemCard.jsx
│   │   ├── ItemDetail.jsx
│   │   ├── Rack.jsx
│   │   ├── RackGrid.jsx
│   │   └── ViewToggle.jsx
│   ├── pages/
│   │   ├── Archive.jsx
│   │   ├── Home.jsx             ← vendor rack view, no + button
│   │   ├── Login.jsx            ← vendor-side full page auth only
│   │   ├── Manage.jsx           ← vendor upload + item management
│   │   ├── VendorPage.jsx       ← public vendor page /v/:handle
│   │   └── Messages.jsx         ← buyer message threads /messages
│   ├── components/
│   │   ├── AuthModal.jsx        ← buyer-facing auth popup
│   │   ├── BuyerAuthGuard.jsx   ← wraps /messages, shows AuthModal if unauthed
│   │   ├── BuyerItemDetail.jsx  ← buyer item detail with save/DM
│   ├── lib/
│   │   └── supabase.js
│   ├── types/
│   │   ├── database.ts           ← DO NOT edit manually
│   │   └── index.ts
│   ├── App.jsx
│   └── index.css
```

---

## Database Schema (v2 — live in Supabase)

### Key relationship chain:
```
auth.users
  └── profiles (1:1, auto-created on signup via trigger)
        └── vendors (1:1, only for approved vendors)
              ├── vendor_feature_flags (1:1, auto-created on vendor insert)
              ├── collections
              │     └── items
              │           ├── item_photos
              │           ├── item_visibility_settings
              │           └── item_ai_suggestions
              └── invite_codes
profiles
  ├── follows (buyer follows vendor)
  ├── saves (buyer saves item)
  └── messages (buyer DMs vendor about item)
```

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → auth.users |
| handle | text | unique, `^[a-z0-9_]{3,30}$` |
| display_name | text | |
| avatar_url | text | |
| created_at / updated_at | timestamptz | |

### `vendors`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profile_id | uuid | unique FK → profiles |
| bio | text | |
| location | text | |
| instagram_handle | text | without @ |
| website_url | text | |
| is_approved | boolean | default false — flip to true to approve |
| invited_by | uuid | FK → vendors (nullable) |
| invite_code | text | unique, auto-generated 8-char code |
| invites_remaining | int | default 3 |
| booth_name | text | |
| markets | text[] | e.g. ['Rose Bowl', 'Melrose'] |

### `vendor_feature_flags`
| Column | Type | Default | Notes |
|---|---|---|---|
| vendor_id | uuid | PK FK → vendors | |
| show_condition_field | boolean | false | Shows condition in upload form |
| show_brand_field | boolean | false | |
| show_era_field | boolean | false | |
| show_measurements_field | boolean | false | |
| show_color_field | boolean | false | |
| show_material_field | boolean | false | |
| show_tags_field | boolean | false | Shows editable tags in upload form |
| enable_saves | boolean | true | |
| enable_dms | boolean | true | |
| enable_search | boolean | true | |

**To enable a field for a vendor** (run in Supabase SQL Editor):
```sql
UPDATE public.vendor_feature_flags
SET show_tags_field = true
WHERE vendor_id = (SELECT id FROM vendors WHERE profile_id = '<profile_id>');
```

### `collections`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vendor_id | uuid | FK → vendors.id (NOT auth.users) |
| name | text | |
| description | text | |
| collection_number | int | drop number |
| is_published | boolean | default false |
| cover_image_url | text | |

### `items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| collection_id | uuid | FK → collections |
| vendor_id | uuid | FK → vendors.id (NOT auth.users) |
| image_url | text | primary display image |
| name | text | |
| description | text | |
| status | item_status | `active` \| `sold` \| `archived` |
| category | item_category | AI-picked from fixed enum |
| category_reviewed | boolean | true after AI has analyzed |
| category_model | text | e.g. `llama-4-scout-17b-16e-instruct` |
| tags | text[] | AI-generated freeform search tags |
| condition | item_condition | AI-picked: `new` \| `excellent` \| `good` \| `fair` |
| brand | text | |
| era | text | e.g. `1970s`, `Y2K` |
| color | text | |
| material | text | |
| size | text | |
| measurements | text | |
| price | numeric(10,2) | |
| is_price_firm | boolean | |
| quantity_available | int | default 1 |
| saves_count | int | denormalized, auto-updated via trigger |
| dms_count | int | denormalized, auto-updated via trigger |
| embedding | vector(1536) | dormant — for future semantic search |

### `item_category` enum (fixed — AI picks from this list)
`tops`, `bottoms`, `outerwear`, `dresses`, `shoes`, `bags`, `jewelry`, `accessories`, `home`, `art`, `vintage`, `other`

### `item_photos`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → items |
| storage_path | text | path in `item-images` bucket |
| is_primary | boolean | |
| sort_order | int | |
| ai_analyzed | boolean | |

### `item_visibility_settings`
Controls which fields buyers can see. All boolean, vendor sets on upload.
`show_name`, `show_description`, `show_size`, `show_price`, `show_quantity`,
`show_condition`, `show_brand`, `show_era`, `show_measurements`, `show_color`, `show_material`, `show_tags`

### `saves`
| Column | Type | Notes |
|---|---|---|
| profile_id | uuid | FK → profiles |
| item_id | uuid | FK → items |
| unique | (profile_id, item_id) | |

Trigger auto-increments `items.saves_count` on insert/delete.

### `messages`
| Column | Type | Notes |
|---|---|---|
| item_id | uuid | FK → items — DMs scoped per item |
| sender_id | uuid | FK → profiles |
| vendor_id | uuid | FK → vendors |
| body | text | |
| is_read | boolean | default false |

Trigger auto-increments `items.dms_count` on first message per sender per item.

### `follows`
| Column | Type | Notes |
|---|---|---|
| follower_id | uuid | FK → profiles |
| vendor_id | uuid | FK → vendors |
| unique | (follower_id, vendor_id) | |

### `invite_codes`
| Column | Type | Notes |
|---|---|---|
| code | text | unique 8-char |
| created_by | uuid | FK → vendors |
| used_by | uuid | FK → profiles (nullable) |
| used_at | timestamptz | |

### `search_logs`
Logs all searches with result count. Zero-result searches indexed separately — use to identify missing tags.

---

## Edge Functions

### `groq-suggest`
- **Location**: `supabase/functions/groq-suggest/index.ts`
- **Model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Input**: `{ imageBase64, mediaType }`
- **Returns**: `{ name, description, suggested_size, category, tags, brand, era, color, condition }`
- **Secret**: `GROQ_API_KEY` via Supabase secrets
- **Deploy**: `supabase functions deploy groq-suggest --project-ref luykttcdfnvfvlktvlhh`
- ⚠️ **After every deploy**: Go to Supabase Dashboard → Edge Functions → groq-suggest → Settings → **turn off JWT Verification** (it resets to on with each deploy)

---

## AI Category Taxonomy

Fixed enum — AI always picks from this list. Do not use freeform categories.
Adding new categories requires: (1) alter the enum, (2) run a backfill Edge Function against items where `category = 'other'` or `category_reviewed = false`.

Tags are freeform (`text[]`) — AI generates 8-15 per item covering:
silhouette/cut, material, era, color, style, distinctive details.
Used for search. Vendor can edit if `show_tags_field` flag is enabled.

---

## Vendor Lookup Pattern

**Critical**: All vendor-owned data now references `vendors.id`, NOT `auth.users.id`.
Always look up vendor id from the vendors table first:

```javascript
// Get vendor id from profile
const { data: { user } } = await supabase.auth.getUser()
const { data: vendor } = await supabase
  .from('vendors')
  .select('id')
  .eq('profile_id', user.id)
  .single()
const vendorId = vendor.id

// Then use vendorId for all queries
const { data: items } = await supabase
  .from('items')
  .select('*')
  .eq('vendor_id', vendorId)
```

Never use `auth.uid()` or `user.id` directly as a vendor_id.

---

## RLS Summary

- `profiles`: public read, own update
- `vendors`: public read (approved only), own update
- `collections`: public read (published only), vendor CRUD own
- `items`: public read (active in published collections), vendor CRUD own
- `saves`, `follows`, `messages`: scoped to sender/follower, vendor reads their own messages
- `vendor_feature_flags`: vendor read own, service role update only (you flip manually)
- `invite_codes`: public read unused codes, vendor insert own

---

## Storage

- **Bucket**: `item-images` (public)
- **Path pattern**: `{user_id}/{timestamp}-{random}.{ext}`
- **Policies**: public read, authenticated upload/delete scoped to own folder

---

## Common Commands

```bash
npm run dev                            # local dev server
npm run dev -- --host                  # expose on network for mobile testing
supabase functions deploy groq-suggest --project-ref luykttcdfnvfvlktvlhh
supabase secrets set GROQ_API_KEY=... --project-ref luykttcdfnvfvlktvlhh
supabase gen types typescript --project-id luykttcdfnvfvlktvlhh > src/types/database.ts
```

---

## App Behavior Rules

- Only `active` items appear on the rack and grid views
- Only `archived` items appear on the archive page
- Vendors only see their own items on vendor-side routes — RLS enforced at DB level
- Public pages (`/v/:handle`, `/v/:handle/collection/:id`) are accessible without auth
- `image_url` on `items` is the primary display image — always populated
- Visibility toggles on `item_visibility_settings` control what buyers see — enforced at app layer
- AI suggestions are non-blocking — form is usable immediately, fields populate when Groq responds
- Collection is required when creating an item
- Category is always shown in upload form (drives collection filter UI)
- Optional fields (tags, brand, era, etc.) are hidden unless vendor's feature flag is enabled
- AI always populates ALL fields in the background regardless of feature flags — data is there when flags are enabled later

---

## Session Notes

- **Supabase project ref**: `luykttcdfnvfvlktvlhh`
- **Git repo**: `https://github.com/cahughes95/lookbook`
- **Email confirmation**: disabled in Supabase — signup logs in immediately
- **Tailwind v4**: `@tailwindcss/vite` plugin only — no `tailwind.config.js`, no PostCSS
- **Mobile testing**: `npm run dev -- --host`, access via Network URL on phone
- **Vendor seeded**: vendor row exists in DB, `is_approved = true`
- **Schema v2**: wiped and rerun clean — all tables reference `vendors.id` not `auth.users.id`
- **quantity_available**: manually added back via `ALTER TABLE` after schema wipe
- **groq-suggest JWT**: must be turned OFF after every deploy in Supabase dashboard
- **Groq model**: `meta-llama/llama-4-scout-17b-16e-instruct`
- **Tags**: saved to DB silently — not shown in upload form unless `show_tags_field = true`
- **Category**: always shown in upload form, AI picks from fixed 12-item enum
- **Backfill pattern**: to re-categorize items, query by `category_reviewed = false` or `category = 'other'`, send `image_url` back through Groq, update item
- **AuthModal**: uses visualViewport API to stay above keyboard on mobile
- **Buyer auth pattern**: AuthModal popup for buyer actions (save/follow/DM), NOT full page redirect. Full page redirect only for vendor routes via AuthGuard
- **BuyerItemDetail desktop bug**: tapping item on VendorPage does nothing on desktop — no console errors, click handler not wiring through correctly. Needs fix.
- **Not yet built**: /inbox (vendor), /v/:handle/collection/:id, buyer profile page, saved items page, invite-only vendor signup flow