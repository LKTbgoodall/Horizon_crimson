//! Client side: what the player sees. The numbers are `crate::rise`'s; this
//! file only hands them to Horizon. The sky itself (moon, cracks, the eye) is
//! `sky_pass.rs`; this file also tells it the time, as the render thread has no host.

use crate::moon::time_of_day;
use crate::night::{eclipse_seconds, presence};
use crate::rise::{frame, shake_angles, Frame};
use crate::server::Shared;
use horizon_client::fog::FogType;
use horizon_client::mod_api::{CameraShakeEvent, ComputeFogColorEvent, Host};

/// The rise's picture now and how present the blood moon is (0 to 1), or
/// None when no blood moon shows.
fn now(shared: &Shared, host: &dyn Host, partial: f32) -> Option<(f32, Frame, f32)> {
    let day_time = host.day_time();
    if !shared.shows(day_time) {
        return None;
    }
    let partial = partial.clamp(0.0, 1.0);
    shared.set_client_clock(day_time, partial);
    let seconds = eclipse_seconds(day_time, partial);
    Some((seconds, frame(seconds), presence(time_of_day(day_time))))
}

/// The fog turns crimson: toward the rise's colour, by its weight.
pub fn compute_fog_color(shared: &Shared, host: &dyn Host, event: &mut ComputeFogColorEvent<'_>) {
    if !matches!(event.fog_type, FogType::Atmospheric) {
        return;
    }
    let Some((_, frame, presence)) = now(shared, host, event.partial) else {
        return;
    };
    // During the omens the frame's own weight grows; after them only dawn fades it.
    let weight = (frame.fog_weight * presence.max(frame.omens) * frame.dark.max(0.3)).clamp(0.0, 1.0);
    for (channel, target) in event.rgb.iter_mut().zip(frame.fog_rgb) {
        *channel = (*channel + (target * frame.dark - *channel) * weight).clamp(0.0, 1.0);
    }
}

/// The ground rumbles through the eclipse and jolts when the eye opens.
pub fn camera_shake(shared: &Shared, host: &dyn Host, event: &mut CameraShakeEvent<'_>) {
    let Some((seconds, frame, _)) = now(shared, host, event.partial) else {
        return;
    };
    if frame.shake_degrees <= 0.0 {
        return;
    }
    let [pitch, yaw] = shake_angles(seconds, frame.shake_degrees);
    event.shake.pitch += pitch;
    event.shake.yaw += yaw;
}
