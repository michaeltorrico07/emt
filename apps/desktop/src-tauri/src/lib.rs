use dotenvy::from_path;
use tauri::{Manager, Position, LogicalPosition};
use std::env;

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
    .setup(|app: &mut tauri::App|{
      let window: tauri::WebviewWindow = app.get_webview_window("main").unwrap();
      let monitor: tauri::Monitor = window.primary_monitor()?.unwrap();
      let screen_size: &tauri::PhysicalSize<u32> = monitor.size();
      let mx: f64 = 20.0;
      let my: f64 = 60.0;

      let window_size: tauri::PhysicalSize<u32> = window.outer_size()?;
      let x: f64 = screen_size.width as f64 - window_size.width as f64 - mx;
      let y: f64 = screen_size.height as f64 - window_size.height as f64 - my;


      window.set_position(Position::Logical(LogicalPosition::new(x, y)))?;

      Ok(())
    })
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

