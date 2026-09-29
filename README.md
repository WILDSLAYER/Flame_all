# Flame_all

Plataforma de insultos dinámicos para videojuegos.

- **`web/`**: página web (Next.js) para publicar insultos y darles Me gusta.
- **`desktop/`**: app de escritorio para Windows (Tauri + React). Detecta el juego, muestra sus personajes y copia el insulto al portapapeles.
- **`supabase/`**: base de datos (tablas, seguridad y datos iniciales).
- **`scripts/`**: utilidades, por ejemplo cargar todos los campeones de LoL.

---

## 1. Requisitos (instalar una sola vez)

1. **Node.js 20 o superior**: https://nodejs.org
2. **Rust**: https://rustup.rs (instala con las opciones por defecto).
3. **Microsoft C++ Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   Al instalar, marca **"Desarrollo para el escritorio con C++"**.
4. WebView2 ya viene con Windows 10 y 11.

## 2. Base de datos (Supabase)

1. Crea un proyecto gratis en https://supabase.com.
2. Ve a **SQL Editor**, pega el contenido de `supabase/migrations/0001_init.sql` y pulsa **Run**.
3. Haz lo mismo con `supabase/seed.sql` (juegos y personajes).
4. En **Project Settings > API** copia la **Project URL** y la clave **anon public**.
5. Opcional: si en **Authentication > Providers > Email** desactivas "Confirm email", los amigos se registran sin tener que confirmar el correo.

Para cargar todos los campeones de League of Legends (PowerShell, desde la raíz):

```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="clave service_role"   # ¡no la subas a git ni la compartas!
node scripts/sync-lol-champions.mjs
```

## 3. Web

```powershell
cd web
copy .env.example .env.local   # y rellena la URL y la clave anon
npm install
npm run dev                    # http://localhost:3000
```

Para publicarla gratis: sube el repo a GitHub e impórtalo en https://vercel.com, con **Root Directory = `web`** y las mismas dos variables de entorno.

## 4. App de escritorio

```powershell
cd desktop
copy .env.example .env         # y rellena la URL y la clave anon
npm install
npm run tauri dev              # modo desarrollo
npm run tauri build            # crea el instalador en src-tauri\target\release\bundle\nsis\
```

La primera compilación de Rust tarda varios minutos; las siguientes son rápidas.

### Cómo se usa

- La app arranca oculta, con un icono en la bandeja del sistema (junto al reloj).
- **Ctrl+Shift+Espacio** abre o cierra la ventana. El atajo se puede cambiar en ⚙.
- La app detecta el juego abierto, carga sus personajes y los insultos de tu idioma.
- Eliges el personaje y haces clic en un insulto: se copia al portapapeles, suena una confirmación y la ventana se oculta. Luego lo pegas en el chat con Ctrl+V.
- Con teclado: escribe el nombre del personaje y pulsa **Enter**, muévete con **↑/↓** y pulsa **Enter** para copiar.
- 🎲 copia un insulto al azar.
- **Esc** o hacer clic en el juego también ocultan la ventana.
- En ⚙ puedes cambiar el atajo, quitar el sonido y activar **Iniciar con Windows**.
- Consejo: juega en **ventana sin bordes**; en pantalla completa exclusiva el juego puede minimizarse al abrir la ventana.

## 5. GitHub Actions (automático)

- **CI** (`.github/workflows/ci.yml`): en cada push a `main` comprueba que la web y la app compilan.
- **Release** (`.github/workflows/release.yml`): crea el instalador `.exe` en GitHub, así tus amigos no necesitan instalar Rust ni Node.
  1. En GitHub ve a **Settings > Secrets and variables > Actions** y crea los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
  2. Sube la versión en `desktop/src-tauri/tauri.conf.json`.
  3. Ejecuta `git tag v0.1.0` y luego `git push origin v0.1.0`.
  4. En **Releases** aparece un borrador con el instalador. Publícalo y comparte el enlace.

## 6. Añadir un juego nuevo

En Supabase (SQL Editor):

```sql
insert into games (id, name, process_names)
values ('dota2', 'Dota 2', array['dota2.exe']);

insert into characters (game_id, name)
select 'dota2', unnest(array['Pudge', 'Invoker', 'Techies']);
```

Los nombres de proceso van **en minúsculas**. Para ver cuál es: abre el juego, abre el Administrador de tareas, pestaña **Detalles**.

## Estructura de datos

| Tabla | Para qué |
| --- | --- |
| `profiles` | Usuario: nombre e idioma |
| `insults` | Texto con `{SUJETO}`, idioma, categoría, contador de Me gusta |
| `insult_games` | Juegos asociados a un insulto (si no tiene, sirve para todos) |
| `likes` | Un Me gusta por usuario e insulto |
| `games` | Juegos y sus nombres de proceso en Windows |
| `characters` | Personajes de cada juego |
