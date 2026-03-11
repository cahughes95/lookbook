# Lookbook
Mobile-first flea market and vintage vendor platform. Vendors upload items with AI-assisted listing creation. Buyers browse public vendor pages, follow vendors, save items, explore local markets.

## Stack
| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin — NO PostCSS, NO tailwind.config.js) |
| Animations | Framer Motion |
| Backend | Supabase (auth, DB, storage, edge functions) |
| Storage | `item-images` bucket (public) — path: `{user_id}/{timestamp}-{random}.{ext}` |
| AI | Groq via `groq-suggest` edge function — model: `meta-llama/llama-4-scout-17b-16e-instruct` |
| Maps | Leaflet + react-leaflet |
| QR | `qrcode.react` — `QRCodeCanvas` |
| Deploy | Vercel (not yet deployed) |

## Project Refs
- Supabase project ref: `luykttcdfnvfvlktvlhh`
- Git: `https://github.com/cahughes95/lookbook`
- Email confirmation: disabled — signup logs in immediately
- groq-suggest JWT: must be OFF after every deploy (Supabase Dashboard → Edge Functions → Settings)

## Commands
```bash
npm run dev
npm run dev -- --host                  # mobile testing via Network URL
supabase functions deploy groq-suggest --project-ref luykttcdfnvfvlktvlhh
supabase secrets set GROQ_API_KEY=... --project-ref luykttcdfnvfvlktvlhh
supabase gen types typescript --project-id luykttcdfnvfvlktvlhh > src/types/database.ts
```

---

## Routes
| Route | Auth | Notes |
|---|---|---|
| `/` | Public | Redirect: vendor → `/vendor`, buyer → `/home`, unauthed → AuthModal |
| `/home` | BuyerAuthGuard | Bulletin / Collections / Explore / Saved tabs |
| `/profile` | BuyerAuthGuard | Buyer profile |
| `/vendor` | AuthGuard (vendor) | Vendor dashboard — Bulletin / Collection / Archive tabs |
| `/vendor-settings` | AuthGuard (vendor) | Profile, QR code, invite management |
| `/signup?invite=:code` | Public | Invite-only vendor signup |
| `/login` | Public | Full page login for vendor routes |
| `/v/:handle` | Public | Public vendor storefront |
| `/v/:handle/collection/:id` | Public | NOT YET BUILT |
| `/inbox` | — | NOT YET BUILT |
| `/messages` | — | Built but hidden from UI |
| `/rack`, `/manage` | — | Redirect → `/vendor` |

---

## Auth Patterns
- **Vendor routes**: `AuthGuard` → redirects to `/login` full page
- **Buyer actions** (save/follow): `AuthModal` popup — never full page redirect
- **BuyerAuthGuard**: protects `/home`, `/profile`

## Vendor Lookup Pattern (CRITICAL)
All vendor-owned data uses `vendors.id`, NOT `auth.users.id`.
```javascript
const { data: { user } } = await supabase.auth.getUser()
const { data: vendor } = await supabase
  .from('vendors')
  .select('id, booth_name, invites_remaining, profile_id, profiles(handle, display_name, avatar_url)')
  .eq('profile_id', user.id)
  .single()
const vendorId = vendor.id  // always use this, never user.id as vendor_id
```

---

## Database Schema

### Relationship chain
```
auth.users → profiles (1:1, trigger on signup)
  └── vendors (1:1, approved only)
        ├── vendor_feature_flags (1:1, auto on vendor insert)
        ├── collections → items → item_photos, item_visibility_settings, item_ai_suggestions
        ├── vendor_locations → locations
        ├── invite_codes
        └── bulletins
profiles → follows, saves, messages
```

### `profiles`
| id | handle | display_name | avatar_url | created_at | updated_at |
|---|---|---|---|---|---|
| uuid PK FK→auth.users | unique `^[a-z0-9_]{3,30}$` | text | text | ts | ts |

### `vendors`
| Column | Notes |
|---|---|
| id | uuid PK |
| profile_id | unique FK → profiles |
| bio, location, instagram_handle, website_url, booth_name | text |
| markets | text[] e.g. `['Rose Bowl', 'Melrose']` |
| is_approved | boolean default false |
| invited_by | FK → vendors (nullable) |
| invite_code | unique 8-char auto-generated |
| invites_remaining | int default 3 |

### `vendor_feature_flags`
All boolean, all default false except `enable_saves/dms/search` (true).
`show_condition_field`, `show_brand_field`, `show_era_field`, `show_measurements_field`, `show_color_field`, `show_material_field`, `show_tags_field`, `enable_saves`, `enable_dms`, `enable_search`

Enable a flag:
```sql
UPDATE public.vendor_feature_flags SET show_tags_field = true
WHERE vendor_id = (SELECT id FROM vendors WHERE profile_id = '<profile_id>');
```

### `collections`
| id | vendor_id | name | description | collection_number | is_published | cover_image_url |
|---|---|---|---|---|---|---|
| uuid PK | FK→vendors.id | text | text | int | bool default false | text |

### `items`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vendor_id | uuid | FK → vendors.id |
| collection_id | uuid | FK → collections |
| image_url | text | primary display image — always populated |
| name, description, size, measurements, brand, era, color, material | text | |
| price | numeric(10,2) | |
| is_price_firm | boolean | |
| quantity_available | int | default 1 |
| status | item_status | `active` \| `sold` \| `archived` |
| sold_at | timestamptz | set when vendor marks sold — drives 7-day auto-archive |
| archived_at | timestamptz | set on archive |
| position | int | vendor-controlled display order |
| category | item_category | AI-picked from fixed enum |
| tags | text[] | AI-generated |
| condition | item_condition | `new` \| `excellent` \| `good` \| `fair` |
| saves_count | int | trigger-maintained |
| dms_count | int | trigger-maintained |
| embedding | vector(1536) | dormant |

### `item_category` enum (fixed — do not add values)
`tops`, `bottoms`, `outerwear`, `dresses`, `shoes`, `bags`, `jewelry`, `accessories`, `home`, `art`, `vintage`, `other`

### `bulletins`
| id | vendor_id | type | body | image_url | location_id | created_at |
|---|---|---|---|---|---|---|
| uuid | FK→vendors | `appearing\|new_stock\|sneak_peek\|general` | max 280 chars | optional | FK→locations nullable | ts |

### `locations` (admin-managed, no public insert)
| id | name | type | address/city/state | lat/lng | description | hours | next_date | pop_level | is_active |
|---|---|---|---|---|---|---|---|---|---|
| uuid | text | `market\|thrift\|pop_up` | text | numeric(9,6) | text | text | date | 1–4 | bool default true |

### `vendor_locations` (junction)
| vendor_id | location_id | next_appearance | notes |
|---|---|---|---|
| FK→vendors | FK→locations | date | text |

### `follows` | `saves`
- `follows`: (follower_id FK→profiles, vendor_id FK→vendors) unique pair
- `saves`: (profile_id FK→profiles, item_id FK→items) unique pair — trigger updates `items.saves_count`

### `messages` (schema only — UI hidden)
| item_id | sender_id | vendor_id | body | is_read |
|---|---|---|---|---|
| FK→items | FK→profiles | FK→vendors | text | bool default false |

### `invite_codes`
| code | created_by | used_by | used_at |
|---|---|---|---|
| unique 8-char | FK→vendors | FK→profiles nullable | timestamptz |

---

## Database Views
```javascript
// bulletin_feed — returns: id, type, body, image_url, created_at, location_id, location_name,
//   vendor_id, vendor_name, vendor_handle, vendor_avatar_url, follower_id
.from('bulletin_feed').select('*').eq('follower_id', user.id).order('created_at', { ascending: false })

// location_map_pins — returns: id, name, type, address, city, lat, lng, description,
//   hours, next_date, pop_level, website_url, instagram_handle, vendor_count
.from('location_map_pins').select('*')

// followed_vendor_items — returns: id, name, description, image_url, price, category, tags,
//   saves_count, created_at, vendor_id, vendor_name, vendor_handle, vendor_avatar_url, follower_id
// ⚠️ Use `vendor_handle` not `handle` for nav links
.from('followed_vendor_items').select('*').eq('follower_id', user.id)
```

---

## Edge Functions

### `groq-suggest`
- Location: `supabase/functions/groq-suggest/index.ts`
- Input: `{ imageBase64, mediaType }`
- Returns: `{ name, description, suggested_size, category, tags, brand, era, color, condition }`
- Secret: `GROQ_API_KEY`
- ⚠️ Turn off JWT verification after every deploy

---

## RLS Summary
- `profiles`: public read, own update
- `vendors`: public read (approved only), own update/insert
- `collections`: public read (published only), vendor CRUD own
- `items`: public read (active), vendor CRUD own
- `bulletins`: public read (approved vendors), vendor CRUD own
- `locations`: public read (active only), admin insert only
- `vendor_locations`: public read (approved vendors), vendor CRUD own
- `saves`, `follows`: scoped to own profile
- `messages`: sender/vendor read own — no UI
- `vendor_feature_flags`: vendor read own, service role update only
- `invite_codes`: public read unused, vendor insert own

---

## Design System
- Background: `#0a0a0a` / `#141414`
- Typography: clean sans-serif, `tracking-[0.15em]` or wider
- Surfaces: `white/5`, `white/10`, `white/30`
- Input: `bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70`
- Primary button: `bg-white/90 text-[#141414]`
- Secondary button: `bg-white/5 border border-white/10 text-white/80`
- Mobile-first, photos are the focus, minimal UI chrome
- Carousel: portrait 3:4 ratio, Framer Motion spring `{stiffness:120, damping:18, mass:1.2}`, NO CSS overflow-x scroll

---

## App Behavior Rules
- Only `active` items show on rack/grid views
- Only `archived` items show on archive tab
- `sold` items show in collection for 7 days (driven by `sold_at`), then auto-archived via cron
- `sold` items move to back of grid with sold indicator visible to buyers
- `image_url` on items is always the primary display image
- AI suggestions are non-blocking — form usable immediately, fields populate async
- AI always populates ALL fields regardless of feature flags
- Tags are AI-generated — vendors can delete tags but not add (v1)
- Category drives collection filter UI — always shown in upload form
- Optional fields (brand, era, etc.) shown only if vendor's feature flag is enabled
- Messaging UI intentionally hidden — do not add DM buttons or inbox links
- `vendor_handle` (not `handle`) is the field from `followed_vendor_items` view

---

## Vendor Signup Flow (`/signup?invite=:code`)
1. Validate code against `invite_codes`
2. `supabase.auth.signUp()`
3. Wait for profiles trigger (retry loop)
4. Update profiles (display_name, handle)
5. Insert vendors row (`is_approved: true`, `invited_by`, `booth_name`) — do NOT set `invites_remaining`, let schema default to 3
6. Mark invite code used
7. Decrement `invites_remaining` on inviting vendor
8. Redirect → `/vendor`

---

## What's Not Built Yet
- `/v/:handle/collection/:id` — public collection page
- `/inbox` — messaging UI (schema ready, build later)
- Vercel deploy
- Desktop polish