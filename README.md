# Petverse MVP Vertical Slice

Next.js App Router + TypeScript MVP for a 3D animal raising loop with:

- Folder-style route shell (`/cage`, `/shop`, `/inventory`, `/settings`)
- React Three Fiber cage scene with `useGLTF` model loading and mesh fallback
- Zustand state and repository abstraction (`LocalStorage` by default, optional Supabase skeleton)

## Install

```bash
npm i
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000` and the app redirects to `/cage`.

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test:ci
```

Formatting:

```bash
npm run format
npm run format:write
```

## 3D Model Convention (glTF)

Animal models are loaded from:

```text
public/models/animals/<animalKey>.glb
```

Current catalog keys:

- `guineaPig`
- `fennec`
- `otter`

Examples:

- `public/models/animals/guineaPig.glb`
- `public/models/animals/fennec.glb`
- `public/models/animals/otter.glb`

If a model file is missing, the cage scene automatically renders a fallback mesh for that animal.

## Supabase (Optional Skeleton)

Copy `.env.example` to `.env.local` and set:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Behavior:

- If both vars are set, `/cage`, `/shop`, `/inventory`, `/settings` require login at `/auth`.
- Logged-in users sync state by `auth.user.id` in `public.game_states`.
- Otherwise, it uses LocalStorage persistence.

### DB Schema Setup (SQL)

Use the migration SQL in:

```text
supabase/migrations/20260214_000001_petverse_core_schema.sql
```

Run it in Supabase SQL Editor (or via Supabase CLI migrations).

What it creates:

- User-scoped core tables: `profiles`, `game_accounts`, `animal_instances`, `inventory_items`
- Cage/extensibility tables: `cages`, `cage_animal_placements`, `cage_decor_placements`
- Backward-compatible snapshot table: `game_states` (used by current app repo)
- RLS policies for all tables
- `animal-thumbnails` storage bucket + CRUD policies scoped by `auth.uid()`
