#[tauri::command]
fn local_runtime_health() -> String {
    aethel_studio_local::daemon::health_body()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![local_runtime_health])
        .run(tauri::generate_context!())
        .expect("failed to run Aethel Studio Local");
}
