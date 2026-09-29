-- =====================================================================
-- Flame_all - Esquema inicial
-- Ejecutar en Supabase: SQL Editor -> pegar y "Run"
-- (o con la CLI: supabase db push)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.insult_category as enum ('basico', 'intermedio', 'ingenioso');

-- ---------------------------------------------------------------------
-- Perfiles (1 por usuario de auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique check (char_length(username) between 3 and 30),
  language    text not null default 'es' check (language ~ '^[a-z]{2}$'),
  created_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, language)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'es')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Juegos y personajes (catálogo que usa la app de escritorio)
-- ---------------------------------------------------------------------
create table public.games (
  id             text primary key,               -- slug, ej. 'valorant'
  name           text not null,
  process_names  text[] not null default '{}',   -- en minúsculas, ej. {'valorant-win64-shipping.exe'}
  created_at     timestamptz not null default now()
);

create table public.characters (
  id        bigint generated always as identity primary key,
  game_id   text not null references public.games (id) on delete cascade,
  name      text not null,
  unique (game_id, name)
);
create index characters_game_idx on public.characters (game_id);

-- ---------------------------------------------------------------------
-- Insultos
-- ---------------------------------------------------------------------
create table public.insults (
  id           bigint generated always as identity primary key,
  text         text not null
                 check (char_length(text) between 10 and 300)
                 check (position('{SUJETO}' in text) > 0),
  language     text not null check (language ~ '^[a-z]{2}$'),
  category     public.insult_category not null default 'basico',
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  likes_count  integer not null default 0,
  created_at   timestamptz not null default now()
);
create index insults_lang_likes_idx   on public.insults (language, likes_count desc);
create index insults_lang_created_idx on public.insults (language, created_at desc);

-- Juegos a los que aplica un insulto (vacío = sirve para cualquier juego)
create table public.insult_games (
  insult_id  bigint not null references public.insults (id) on delete cascade,
  game_id    text   not null references public.games (id)   on delete cascade,
  primary key (insult_id, game_id)
);
create index insult_games_game_idx on public.insult_games (game_id);

-- ---------------------------------------------------------------------
-- Me gusta (uno por usuario e insulto)
-- ---------------------------------------------------------------------
create table public.likes (
  user_id    uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  insult_id  bigint not null references public.insults (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, insult_id)
);
create index likes_insult_created_idx on public.likes (insult_id, created_at);

-- Mantiene insults.likes_count sincronizado
create or replace function public.update_likes_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.insults set likes_count = likes_count + 1 where id = new.insult_id;
  elsif tg_op = 'DELETE' then
    update public.insults set likes_count = likes_count - 1 where id = old.insult_id;
  end if;
  return null;
end;
$$;

create trigger likes_count_trg
  after insert or delete on public.likes
  for each row execute function public.update_likes_count();

-- ---------------------------------------------------------------------
-- Vista con autor y juegos (para la web)
-- ---------------------------------------------------------------------
create view public.insults_feed
with (security_invoker = true) as
select
  i.id,
  i.text,
  i.language,
  i.category,
  i.likes_count,
  i.created_at,
  i.author_id,
  p.username as author_username,
  coalesce(
    (select array_agg(ig.game_id order by ig.game_id)
       from public.insult_games ig where ig.insult_id = i.id),
    '{}'
  ) as game_ids
from public.insults i
join public.profiles p on p.id = i.author_id;

-- ---------------------------------------------------------------------
-- Top semanal: Me gusta recibidos en los últimos 7 días
-- ---------------------------------------------------------------------
create or replace function public.top_weekly(p_language text, p_limit int default 50)
returns table (
  id bigint, text text, language text, category public.insult_category,
  likes_count int, weekly_likes bigint, author_username text, created_at timestamptz
)
language sql stable
set search_path = public
as $$
  select i.id, i.text, i.language, i.category, i.likes_count,
         count(l.*) as weekly_likes, p.username, i.created_at
  from public.insults i
  join public.profiles p on p.id = i.author_id
  join public.likes l on l.insult_id = i.id and l.created_at > now() - interval '7 days'
  where i.language = p_language
  group by i.id, p.username
  order by weekly_likes desc, i.likes_count desc
  limit least(p_limit, 200);
$$;

-- ---------------------------------------------------------------------
-- Insultos para la app de escritorio: idioma + juego (genéricos incluidos)
-- ---------------------------------------------------------------------
create or replace function public.insults_for_app(
  p_language text,
  p_game_id  text default null,
  p_limit    int  default 100
)
returns table (id bigint, text text, category public.insult_category, likes_count int)
language sql stable
set search_path = public
as $$
  select i.id, i.text, i.category, i.likes_count
  from public.insults i
  where i.language = p_language
    and (
      not exists (select 1 from public.insult_games ig where ig.insult_id = i.id)
      or (p_game_id is not null and exists (
            select 1 from public.insult_games ig
            where ig.insult_id = i.id and ig.game_id = p_game_id))
    )
  order by i.likes_count desc, i.created_at desc
  limit least(p_limit, 500);
$$;

-- ---------------------------------------------------------------------
-- Seguridad (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.games        enable row level security;
alter table public.characters   enable row level security;
alter table public.insults      enable row level security;
alter table public.insult_games enable row level security;
alter table public.likes        enable row level security;

-- Lectura pública (la app de escritorio no inicia sesión)
create policy "profiles: lectura pública"     on public.profiles     for select using (true);
create policy "games: lectura pública"        on public.games        for select using (true);
create policy "characters: lectura pública"   on public.characters   for select using (true);
create policy "insults: lectura pública"      on public.insults      for select using (true);
create policy "insult_games: lectura pública" on public.insult_games for select using (true);
create policy "likes: lectura pública"        on public.likes        for select using (true);

-- Perfil: cada uno edita el suyo
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Insultos: publicar y borrar los propios (sin moderación)
create policy "insults: publicar" on public.insults
  for insert to authenticated
  with check (author_id = auth.uid() and likes_count = 0);
create policy "insults: borrar el propio" on public.insults
  for delete to authenticated
  using (author_id = auth.uid());

create policy "insult_games: asociar a insulto propio" on public.insult_games
  for insert to authenticated
  with check (exists (
    select 1 from public.insults i where i.id = insult_id and i.author_id = auth.uid()));

-- Me gusta: dar y quitar los propios
create policy "likes: dar" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "likes: quitar" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- Los usuarios no pueden cambiar likes_count ni el texto directamente
revoke update on public.insults from anon, authenticated;
