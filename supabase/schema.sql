-- ============================================================
-- Lookbook MVP — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- Items table
create table if not exists public.items (
  id          uuid        primary key default gen_random_uuid(),
  vendor_id   uuid        not null references auth.users(id) on delete cascade,
  image_url   text        not null,
  status      text        not null default 'in_stock'
                          check (status in ('in_stock', 'archived')),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- Row Level Security
alter table public.items enable row level security;

create policy "vendors_select_own" on public.items
  for select using (auth.uid() = vendor_id);

create policy "vendors_insert_own" on public.items
  for insert with check (auth.uid() = vendor_id);

create policy "vendors_update_own" on public.items
  for update using (auth.uid() = vendor_id);

-- ============================================================
-- Storage bucket for item images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Anyone can read (images are displayed publicly via URL)
create policy "public_read_images" on storage.objects
  for select using (bucket_id = 'item-images');

-- Authenticated users can upload into their own folder ({user_id}/...)
create policy "authenticated_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can delete their own files
create policy "authenticated_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
