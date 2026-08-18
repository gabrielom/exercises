// Thin shim: everything lives in the library crate so the same app can be
// reused by another target later without moving code around.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    exercises_lib::run()
}
