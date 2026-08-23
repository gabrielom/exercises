use std::path::Path;

fn main() {
    // The web assets are embedded into the binary at compile time, and nothing
    // in Tauri tells cargo to watch them: tauri-build emits rerun-if-changed for
    // tauri.conf.json, capabilities and resources, and tauri-codegen — which is
    // what actually reads the frontend — emits none at all. So a build after
    // editing only HTML, CSS or JS finds the crate "fresh", skips compiling, and
    // ships the assets baked into the previous binary. Watch every bundled file.
    watch(Path::new("../dist"));
    tauri_build::build()
}

fn watch(dir: &Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            watch(&path);
        } else {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }
}
