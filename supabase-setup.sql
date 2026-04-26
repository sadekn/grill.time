-- ============================================================
-- Grill Time — Supabase setup
-- Run this entire script in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- Table ----------

create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('chicken', 'meat')),
  tag          text not null,
  title        text not null,
  title_ar     text,
  description  text not null,
  price        numeric(10, 2) not null,
  image_url    text,
  is_featured  boolean not null default false,
  ribbon       text,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_menu_items_cat_sort
  on public.menu_items (category, sort_order);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------

alter table public.menu_items enable row level security;

drop policy if exists "Public can read menu" on public.menu_items;
create policy "Public can read menu"
  on public.menu_items for select
  using (true);

drop policy if exists "Authenticated can insert" on public.menu_items;
create policy "Authenticated can insert"
  on public.menu_items for insert
  to authenticated with check (true);

drop policy if exists "Authenticated can update" on public.menu_items;
create policy "Authenticated can update"
  on public.menu_items for update
  to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete" on public.menu_items;
create policy "Authenticated can delete"
  on public.menu_items for delete
  to authenticated using (true);

-- ---------- Storage bucket for images ----------

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read menu images" on storage.objects;
create policy "Public read menu images"
  on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists "Authenticated upload menu images" on storage.objects;
create policy "Authenticated upload menu images"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'menu-images');

drop policy if exists "Authenticated update menu images" on storage.objects;
create policy "Authenticated update menu images"
  on storage.objects for update
  to authenticated using (bucket_id = 'menu-images');

drop policy if exists "Authenticated delete menu images" on storage.objects;
create policy "Authenticated delete menu images"
  on storage.objects for delete
  to authenticated using (bucket_id = 'menu-images');

-- ---------- Seed: current menu items ----------
-- Image URLs reference the static images already shipped with the site
-- (relative paths resolve against the public site origin). Once you
-- replace an image via the admin page, the URL becomes a Supabase
-- Storage public URL automatically.

insert into public.menu_items
  (category, tag, title, title_ar, description, price, image_url, is_featured, ribbon, sort_order)
values
  ('chicken', 'Whole Bird',  'Whole Grill Chicken',
   'دجاج مشوي كامل',
   'A whole chicken, charcoal-grilled to golden perfection. Built to share — served with our signature sides and Time Food garlic sauce.',
   16.50, 'images/menu/whole-chicken.jpg', true,  'House Favorite', 10),

  ('chicken', 'Happy Time',  'Grill Chicken Sandwich',
   'ساندويتش دجاج مشوي',
   'Charcoal-grilled chicken with Time Food garlic sauce, fresh vegetables and pickles — wrapped to order.',
   4.00,  'images/menu/signature-chicken.jpg', false, null, 20),

  ('chicken', 'Golden Time', 'Shish Taouk',
   'شيش طاووق كلاسيك',
   'Classic garlic-marinated shish taouk, charcoal grilled and wrapped with fresh vegetables.',
   3.50,  'images/menu/shish-taouk.jpg', false, null, 30),

  ('chicken', 'Grill Time',  'Special Shish Taouk',
   'شيش طاووق خاص',
   'Our special shish taouk, uniquely marinated, charcoal grilled and finished with Time Food garlic sauce for a bold signature flavor.',
   3.50,  'images/menu/special-taouk.jpg', false, null, 40),

  ('meat',    'Perfect Time','Kafta Wrap',
   'كفتة بيرفكت تايم',
   'Fresh kafta prepared daily, charcoal grilled with grilled tomato, finished with Time Food tarator or chili tarator.',
   4.44,  'images/menu/kafta.jpg', false, null, 10),

  ('meat',    'Best Time',   'Lamb Cubes',
   'مكعبات لحم غنم',
   'Premium lamb cubes grilled over charcoal with grilled tomato, parsley, sumac, finished with Time Food tarator or chili tarator.',
   5.55,  'images/menu/lamb-cubes.jpg', false, null, 20),

  ('meat',    'Hot Time',    'Soujouk Wrap',
   'سجق هوت تايم',
   'Spiced minced meat with garlic and chili, charcoal grilled, wrapped with Time Food garlic sauce, tomato, cucumber, and pickles.',
   4.44,  'images/menu/soujouk.jpg', false, null, 30);
