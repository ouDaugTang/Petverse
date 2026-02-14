begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Backward-compatible snapshot table used by current app repo.
create table if not exists public.game_states (
  player_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  selected_animal_id uuid null,
  state_version integer not null default 1 check (state_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.animal_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species_key text not null,
  variant_key text not null default 'default',
  nickname text,
  age_days integer not null default 0 check (age_days >= 0),
  hunger numeric(5, 2) not null default 100 check (hunger >= 0 and hunger <= 100),
  is_dead boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  thumbnail_path text,
  genetics jsonb not null default '{}'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create table if not exists public.inventory_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_key text not null,
  quantity integer not null default 0 check (quantity >= 0),
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_key)
);

create table if not exists public.cages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  floor_skin_key text,
  wall_skin_key text,
  environment_key text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create table if not exists public.cage_animal_placements (
  cage_id uuid not null,
  animal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  x double precision not null default 0,
  y double precision not null default 0,
  z double precision not null default 0,
  rotation_y double precision not null default 0,
  scale double precision not null default 1 check (scale > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cage_id, animal_id),
  constraint cage_animal_placements_cage_fkey
    foreign key (cage_id, user_id) references public.cages(id, user_id) on delete cascade,
  constraint cage_animal_placements_animal_fkey
    foreign key (animal_id, user_id) references public.animal_instances(id, user_id) on delete cascade
);

create table if not exists public.cage_decor_placements (
  id uuid primary key default gen_random_uuid(),
  cage_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  decor_key text not null,
  slot_type text,
  x double precision not null default 0,
  y double precision not null default 0,
  z double precision not null default 0,
  rotation_y double precision not null default 0,
  scale double precision not null default 1 check (scale > 0),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cage_decor_placements_cage_fkey
    foreign key (cage_id, user_id) references public.cages(id, user_id) on delete cascade
);

update public.game_accounts ga
set selected_animal_id = null
where selected_animal_id is not null
  and not exists (
    select 1
    from public.animal_instances ai
    where ai.id = ga.selected_animal_id
      and ai.user_id = ga.user_id
  );

alter table public.game_accounts
  drop constraint if exists game_accounts_selected_animal_fkey;

alter table public.game_accounts
  add constraint game_accounts_selected_animal_fkey
  foreign key (selected_animal_id, user_id)
  references public.animal_instances (id, user_id)
  on delete set null (selected_animal_id);

create index if not exists idx_animal_instances_user_id
  on public.animal_instances(user_id);
create index if not exists idx_animal_instances_species_variant
  on public.animal_instances(user_id, species_key, variant_key);
create index if not exists idx_animal_instances_active
  on public.animal_instances(user_id)
  where deleted_at is null;

create index if not exists idx_inventory_items_user_id
  on public.inventory_items(user_id);

create index if not exists idx_cages_user_id
  on public.cages(user_id);

create index if not exists idx_cage_animal_placements_user_id
  on public.cage_animal_placements(user_id);
create index if not exists idx_cage_animal_placements_animal_id
  on public.cage_animal_placements(animal_id);

create index if not exists idx_cage_decor_placements_user_id
  on public.cage_decor_placements(user_id);
create index if not exists idx_cage_decor_placements_cage_id
  on public.cage_decor_placements(cage_id);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_game_accounts on public.game_accounts;
create trigger set_updated_at_game_accounts
before update on public.game_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_animal_instances on public.animal_instances;
create trigger set_updated_at_animal_instances
before update on public.animal_instances
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_items on public.inventory_items;
create trigger set_updated_at_inventory_items
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_cages on public.cages;
create trigger set_updated_at_cages
before update on public.cages
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_cage_animal_placements on public.cage_animal_placements;
create trigger set_updated_at_cage_animal_placements
before update on public.cage_animal_placements
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_cage_decor_placements on public.cage_decor_placements;
create trigger set_updated_at_cage_decor_placements
before update on public.cage_decor_placements
for each row execute function public.set_updated_at();

alter table public.game_states enable row level security;
alter table public.profiles enable row level security;
alter table public.game_accounts enable row level security;
alter table public.animal_instances enable row level security;
alter table public.inventory_items enable row level security;
alter table public.cages enable row level security;
alter table public.cage_animal_placements enable row level security;
alter table public.cage_decor_placements enable row level security;

drop policy if exists game_states_select_own on public.game_states;
create policy game_states_select_own
on public.game_states
for select
to authenticated
using (auth.uid() = player_id);

drop policy if exists game_states_insert_own on public.game_states;
create policy game_states_insert_own
on public.game_states
for insert
to authenticated
with check (auth.uid() = player_id);

drop policy if exists game_states_update_own on public.game_states;
create policy game_states_update_own
on public.game_states
for update
to authenticated
using (auth.uid() = player_id)
with check (auth.uid() = player_id);

drop policy if exists game_states_delete_own on public.game_states;
create policy game_states_delete_own
on public.game_states
for delete
to authenticated
using (auth.uid() = player_id);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists game_accounts_select_own on public.game_accounts;
create policy game_accounts_select_own
on public.game_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists game_accounts_insert_own on public.game_accounts;
create policy game_accounts_insert_own
on public.game_accounts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists game_accounts_update_own on public.game_accounts;
create policy game_accounts_update_own
on public.game_accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists game_accounts_delete_own on public.game_accounts;
create policy game_accounts_delete_own
on public.game_accounts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists animal_instances_select_own on public.animal_instances;
create policy animal_instances_select_own
on public.animal_instances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists animal_instances_insert_own on public.animal_instances;
create policy animal_instances_insert_own
on public.animal_instances
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists animal_instances_update_own on public.animal_instances;
create policy animal_instances_update_own
on public.animal_instances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists animal_instances_delete_own on public.animal_instances;
create policy animal_instances_delete_own
on public.animal_instances
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists inventory_items_select_own on public.inventory_items;
create policy inventory_items_select_own
on public.inventory_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists inventory_items_insert_own on public.inventory_items;
create policy inventory_items_insert_own
on public.inventory_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists inventory_items_update_own on public.inventory_items;
create policy inventory_items_update_own
on public.inventory_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists inventory_items_delete_own on public.inventory_items;
create policy inventory_items_delete_own
on public.inventory_items
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists cages_select_own on public.cages;
create policy cages_select_own
on public.cages
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists cages_insert_own on public.cages;
create policy cages_insert_own
on public.cages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists cages_update_own on public.cages;
create policy cages_update_own
on public.cages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists cages_delete_own on public.cages;
create policy cages_delete_own
on public.cages
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists cage_animal_placements_select_own on public.cage_animal_placements;
create policy cage_animal_placements_select_own
on public.cage_animal_placements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists cage_animal_placements_insert_own on public.cage_animal_placements;
create policy cage_animal_placements_insert_own
on public.cage_animal_placements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists cage_animal_placements_update_own on public.cage_animal_placements;
create policy cage_animal_placements_update_own
on public.cage_animal_placements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists cage_animal_placements_delete_own on public.cage_animal_placements;
create policy cage_animal_placements_delete_own
on public.cage_animal_placements
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists cage_decor_placements_select_own on public.cage_decor_placements;
create policy cage_decor_placements_select_own
on public.cage_decor_placements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists cage_decor_placements_insert_own on public.cage_decor_placements;
create policy cage_decor_placements_insert_own
on public.cage_decor_placements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists cage_decor_placements_update_own on public.cage_decor_placements;
create policy cage_decor_placements_update_own
on public.cage_decor_placements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists cage_decor_placements_delete_own on public.cage_decor_placements;
create policy cage_decor_placements_delete_own
on public.cage_decor_placements
for delete
to authenticated
using (auth.uid() = user_id);

-- Optional bucket used by thumbnail uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animal-thumbnails', 'animal-thumbnails', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists animal_thumbnails_select_own on storage.objects;
create policy animal_thumbnails_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'animal-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists animal_thumbnails_insert_own on storage.objects;
create policy animal_thumbnails_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'animal-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists animal_thumbnails_update_own on storage.objects;
create policy animal_thumbnails_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'animal-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'animal-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists animal_thumbnails_delete_own on storage.objects;
create policy animal_thumbnails_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'animal-thumbnails'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
