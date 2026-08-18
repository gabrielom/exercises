use tauri::Manager;

/// Write a backup file to the user's Downloads folder and report where it went.
///
/// The web build hands the browser a blob and lets it download; a WKWebView has
/// no download behaviour of its own, so the button would silently do nothing.
/// Writing straight to Downloads matches what the browser does anyway — no file
/// picker to dismiss, same destination — and keeps this to core Tauri APIs.
#[tauri::command]
fn save_backup(app: tauri::AppHandle, name: String, contents: String) -> Result<String, String> {
    // Refuse anything that could climb out of the folder we mean to write to.
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("bad file name".into());
    }
    let dir = app
        .path()
        .download_dir()
        .map_err(|e| format!("no Downloads folder: {e}"))?;
    let path = dir.join(name);
    std::fs::write(&path, contents).map_err(|e| format!("could not write the file: {e}"))?;
    Ok(path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_backup])
        .run(tauri::generate_context!())
        .expect("error while running the Exercises app");
}
