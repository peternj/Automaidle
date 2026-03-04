import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

// ── Supabase SQL schema (run once in dashboard → SQL Editor) ─────────────────
//
// -- 1. Player profiles (auto-created on signup via trigger)
// create table public.profiles (
//   id uuid references auth.users on delete cascade primary key,
//   username text unique,
//   created_at timestamptz default now()
// );
// alter table public.profiles enable row level security;
// create policy "Users can manage own profile"
//   on public.profiles for all using (auth.uid() = id);
//
// -- 2. One cloud save per player
// create table public.game_saves (
//   user_id uuid references auth.users on delete cascade primary key,
//   save_data jsonb not null,
//   updated_at timestamptz default now()
// );
// alter table public.game_saves enable row level security;
// create policy "Users can manage own save"
//   on public.game_saves for all using (auth.uid() = user_id);
//
// -- 3. Global market prices (shared across all players via Realtime)
// create table public.market_prices (
//   resource text primary key,
//   price integer not null default 1,
//   updated_at timestamptz default now()
// );
// alter table public.market_prices enable row level security;
// create policy "Anyone can read prices"
//   on public.market_prices for select using (true);
// -- Only a service-role edge function should write prices.
//
// -- Enable Realtime on market_prices:
// alter publication supabase_realtime add table public.market_prices;
