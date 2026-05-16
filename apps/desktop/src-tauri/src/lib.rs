use dotenvy::from_path;
use std::env;
use tauri::{Emitter, LogicalPosition, Manager, Position};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cwd: std::path::PathBuf = env::current_dir().unwrap();
    let env_path: std::path::PathBuf = cwd.join("../../../.env");
    println!("{:?}", env_path);
    from_path(env_path).ok();
    let theme: String = env::var("THEME").unwrap();
    println!("theme: {}", theme);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app: &mut tauri::App| {
            let window: tauri::WebviewWindow = app.get_webview_window("main").unwrap();
            let monitor: tauri::Monitor = window.primary_monitor()?.unwrap();
            let screen_size: &tauri::PhysicalSize<u32> = monitor.size();
            let mr: f64 = 100.0;
            let mb: f64 = 100.0;

            let window_size: tauri::PhysicalSize<u32> = window.outer_size()?;
            let x: f64 = screen_size.width as f64 - window_size.width as f64 - mr;
            let y: f64 = screen_size.height as f64 - window_size.height as f64 - mb;
            window.set_position(Position::Logical(LogicalPosition::new(x, y)))?;

            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                test_agent_sidecar(handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn test_agent_sidecar(app: tauri::AppHandle) {
    use tauri_plugin_shell::process::CommandEvent;
    use tauri_plugin_shell::ShellExt;

    println!("[agent] iniciando sidecar...");

    let sidecar = match app.shell().sidecar("agent-tools") {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[agent] error creando sidecar: {e}");
            return;
        }
    };

    let (mut rx, _child) = match sidecar.spawn() {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[agent] error spawneando: {e}");
            return;
        }
    };

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                println!("[agent stdout] {}", text);

                // parsear el JSON que manda agent-tools
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                    // emitir al frontend
                    app.emit("agent-event", parsed).ok();
                }
            }
            CommandEvent::Stderr(line) => {
                eprintln!("[agent stderr] {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Terminated(status) => {
                println!("[agent] proceso terminado: {:?}", status);
                break;
            }
            _ => {}
        }
    }
}
