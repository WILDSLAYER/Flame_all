// Carga todos los campeones de League of Legends desde Data Dragon (Riot)
// y los inserta en la tabla characters.
//
// Uso (PowerShell):
//   $env:SUPABASE_URL="https://xxxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # Settings > API > service_role (¡no la compartas!)
//   node scripts/sync-lol-champions.mjs
//
// Requiere Node 18 o superior (usa fetch nativo).

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const versions = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
const latest = versions[0];
const data = await (
  await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/es_MX/champion.json`)
).json();

const rows = Object.values(data.data).map((c) => ({ game_id: "lol", name: c.name }));
console.log(`Data Dragon ${latest}: ${rows.length} campeones`);

const res = await fetch(`${url}/rest/v1/characters?on_conflict=game_id,name`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("Error al insertar:", res.status, await res.text());
  process.exit(1);
}
console.log("Listo.");
