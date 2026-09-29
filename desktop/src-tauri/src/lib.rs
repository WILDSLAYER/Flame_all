//! Flame_all - lado nativo (Rust)
//!
//! Responsabilidades:
//! - Atajo global (por defecto Ctrl+Shift+Espacio) que muestra/oculta la ventana.
//! - Icono en la bandeja del sistema (System Tray) con "Mostrar" y "Salir".
//! - Listar los procesos en ejecución para detectar el juego.
//!   Solo lee NOMBRES de procesos; nunca abre ni lee la memoria de un juego
//!   (así no molesta a los anti-cheat como Vanguard o EAC).

use std::collections::BTreeSet;
use std::sync::Mutex;

use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub const DEFAULT_HOTKEY: &str = "Ctrl+Shift+Space";

/// Atajo registrado actualmente.
struct HotkeyState(Mutex<String>);

/// Muestra la ventana principal y avisa al frontend para que refresque (juego, insultos).
fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        let _ = app.emit("window-shown", ());
    }
}

fn toggle_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            show_main(app);
        }
    }
}

/// Devuelve los nombres (en minúsculas y sin repetir) de los procesos en ejecución.
#[tauri::command]
fn list_processes() -> Vec<String> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());
    sys.processes()
        .values()
        .map(|p| p.name().to_string_lossy().to_lowercase())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

/// Cambia el atajo global. Ej: "Ctrl+Shift+Space", "Alt+F1".
#[tauri::command]
fn set_hotkey(app: AppHandle, state: State<HotkeyState>, accelerator: String) -> Result<String, String> {
    let new: Shortcut = accelerator
        .parse()
        .map_err(|e| format!("Atajo inválido '{accelerator}': {e}"))?;

    let gs = app.global_shortcut();
    let mut current = state.0.lock().map_err(|e| e.to_string())?;

    if let Ok(old) = current.parse::<Shortcut>() {
        let _ = gs.unregister(old);
    }
    if let Err(e) = gs.register(new) {
        // Si falla (otro programa ya lo usa), se restaura el anterior
        if let Ok(old) = current.parse::<Shortcut>() {
            let _ = gs.register(old);
        }
        return Err(format!("No se pudo registrar '{accelerator}' (¿lo usa otro programa?): {e}"));
    }
    *current = accelerator.clone();
    Ok(accelerator)
}

#[tauri::command]
fn get_hotkey(state: State<HotkeyState>) -> String {
    state.0.lock().map(|s| s.clone()).unwrap_or_else(|_| DEFAULT_HOTKEY.into())
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Si se abre la app dos veces, la segunda solo muestra la ventana existente
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_clipboard_manager::init())
        // Iniciar con Windows (se activa/desactiva desde Ajustes)
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_main(app);
                    }
                })
                .build(),
        )
        .manage(HotkeyState(Mutex::new(DEFAULT_HOTKEY.to_string())))
        .setup(|app| {
            // Atajo por defecto (el frontend lo cambia si el usuario guardó otro)
            if let Err(e) = app.global_shortcut().register(DEFAULT_HOTKEY) {
                eprintln!("No se pudo registrar el atajo por defecto: {e}");
            }

            // Bandeja del sistema
            let show = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Flame_all (Ctrl+Shift+Espacio)")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Cerrar la ventana solo la oculta; la app sigue en la bandeja
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            // Al volver al juego (la ventana pierde el foco) se oculta sola
            WindowEvent::Focused(false) => {
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            list_processes,
            set_hotkey,
            get_hotkey,
            hide_window
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Flame_all");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn atajos_validos() {
        for a in [DEFAULT_HOTKEY, "Alt+F1", "Ctrl+Alt+I", "Super+Shift+K"] {
            assert!(a.parse::<Shortcut>().is_ok(), "{a} debería ser válido");
        }
        assert!("Ctrl+Nada".parse::<Shortcut>().is_err());
    }

    #[test]
    fn lista_procesos_en_minusculas() {
        let procs = list_processes();
        assert!(!procs.is_empty());
        assert!(procs.iter().all(|p| *p == p.to_lowercase()));
    }
}
