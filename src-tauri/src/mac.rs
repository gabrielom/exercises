//! Moving the window controls into the content column.
//!
//! With `titleBarStyle: Overlay` macOS draws the close/minimise/zoom buttons in
//! the window's top-left corner. The design wants them on the left edge of the
//! content column instead, so the tabs, the group chips and the grid all read
//! down from the same line and the controls sit on it rather than beside it.
//!
//! Tauri 2.11 only exposes `traffic_light_position` on the window *builder*, so
//! there is no supported way to move them again when the window is resized —
//! hence talking to AppKit directly. Only the horizontal position is touched;
//! the vertical one already lines up with the tabs row.

use objc2::encode::{Encode, Encoding};
use objc2::msg_send;
use objc2::runtime::AnyObject;

#[repr(C)]
#[derive(Clone, Copy)]
struct CGPoint {
    x: f64,
    y: f64,
}
#[repr(C)]
#[derive(Clone, Copy)]
struct CGSize {
    width: f64,
    height: f64,
}
#[repr(C)]
#[derive(Clone, Copy)]
struct CGRect {
    origin: CGPoint,
    size: CGSize,
}

unsafe impl Encode for CGPoint {
    const ENCODING: Encoding = Encoding::Struct("CGPoint", &[f64::ENCODING, f64::ENCODING]);
}
unsafe impl Encode for CGSize {
    const ENCODING: Encoding = Encoding::Struct("CGSize", &[f64::ENCODING, f64::ENCODING]);
}
unsafe impl Encode for CGRect {
    const ENCODING: Encoding = Encoding::Struct("CGRect", &[CGPoint::ENCODING, CGSize::ENCODING]);
}

/// NSWindowButton: close, miniaturize, zoom.
const BUTTONS: [usize; 3] = [0, 1, 2];

/// How far the controls may be moved from wherever AppKit put them. The page
/// asks for a few tens of points at most; anything larger means a coordinate
/// assumption below is wrong, and doing nothing beats flinging them off-window.
const MAX_TRAVEL: f64 = 60.0;

/// Put the three controls so the leftmost one starts at `x` and their centres
/// sit `y` points below the top of the window — both in the page's own
/// coordinates, since the webview fills the window.
///
/// Spacing is read from AppKit rather than assumed, and both shifts are applied
/// to every button equally, so the row keeps whatever arrangement the system
/// gave it. The shifts are computed against the buttons' current frames, so
/// calling this again after a resize re-converges instead of drifting.
///
/// # Safety
/// `ns_window` must be a live `NSWindow`, and this must run on the main thread.
pub unsafe fn place_controls(ns_window: *mut std::ffi::c_void, x: f64, y: f64) {
    let window = ns_window as *mut AnyObject;
    if window.is_null() {
        return;
    }
    let close: *mut AnyObject = unsafe { msg_send![window, standardWindowButton: BUTTONS[0]] };
    if close.is_null() {
        return;
    }
    let titlebar: *mut AnyObject = unsafe { msg_send![close, superview] };
    if titlebar.is_null() {
        return;
    }
    // The titlebar view is unflipped — y grows upward from its bottom edge — and
    // its top edge is the top of the window, so a distance measured downward
    // from the window top becomes `height - distance` measured up from the
    // bottom. Its bounds, not its frame: child frames live in bounds space.
    let bounds: CGRect = unsafe { msg_send![titlebar, bounds] };
    let frame: CGRect = unsafe { msg_send![close, frame] };
    let dx = x - frame.origin.x;
    let dy = (bounds.size.height - y - frame.size.height / 2.0) - frame.origin.y;
    if dx.abs() < 0.5 && dy.abs() < 0.5 {
        return;
    }
    if dx.abs() > MAX_TRAVEL + bounds.size.width || dy.abs() > MAX_TRAVEL {
        return;
    }
    for index in BUTTONS {
        let button: *mut AnyObject = unsafe { msg_send![window, standardWindowButton: index] };
        if button.is_null() {
            continue;
        }
        let f: CGRect = unsafe { msg_send![button, frame] };
        let origin = CGPoint {
            x: f.origin.x + dx,
            y: f.origin.y + dy,
        };
        let _: () = unsafe { msg_send![button, setFrameOrigin: origin] };
    }
}
