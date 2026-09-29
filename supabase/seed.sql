-- =====================================================================
-- Flame_all - Datos iniciales: juegos y personajes
-- Ejecutar después de 0001_init.sql.
-- Los nombres de proceso van en minúsculas.
-- League of Legends tiene muchos campeones: cárgalos con
--   node scripts/sync-lol-champions.mjs   (usa Data Dragon de Riot)
-- =====================================================================

insert into public.games (id, name, process_names) values
  ('valorant',    'Valorant',          array['valorant-win64-shipping.exe', 'valorant.exe']),
  ('overwatch2',  'Overwatch 2',       array['overwatch.exe']),
  ('lol',         'League of Legends', array['league of legends.exe', 'leagueclientux.exe'])
on conflict (id) do update
  set name = excluded.name, process_names = excluded.process_names;

-- Valorant
insert into public.characters (game_id, name)
select 'valorant', unnest(array[
  'Astra','Breach','Brimstone','Chamber','Clove','Cypher','Deadlock','Fade','Gekko',
  'Harbor','Iso','Jett','KAY/O','Killjoy','Neon','Omen','Phoenix','Raze','Reyna',
  'Sage','Skye','Sova','Tejo','Veto','Viper','Vyse','Waylay','Yoru'
])
on conflict (game_id, name) do nothing;

-- Overwatch 2
insert into public.characters (game_id, name)
select 'overwatch2', unnest(array[
  -- Tanques
  'D.Va','Doomfist','Hazard','Junker Queen','Mauga','Orisa','Ramattra','Reinhardt',
  'Roadhog','Sigma','Winston','Wrecking Ball','Zarya',
  -- Daño
  'Ashe','Bastion','Cassidy','Echo','Freja','Genji','Hanzo','Junkrat','Mei','Pharah',
  'Reaper','Sojourn','Soldier: 76','Sombra','Symmetra','Torbjörn','Tracer','Venture',
  'Widowmaker',
  -- Apoyo
  'Ana','Baptiste','Brigitte','Illari','Juno','Kiriko','Lifeweaver','Lúcio','Mercy',
  'Moira','Wuyang','Zenyatta'
])
on conflict (game_id, name) do nothing;

-- League of Legends (unos pocos para probar; el script carga todos)
insert into public.characters (game_id, name)
select 'lol', unnest(array['Yasuo','Yone','Teemo','Lee Sin','Ahri','Jinx','Thresh','Master Yi'])
on conflict (game_id, name) do nothing;
