fn main() {
    // Nothing to watch: the window loads the deployed site, so no web assets are
    // compiled in and a stale embed is not a thing that can happen any more.
    tauri_build::build()
}
