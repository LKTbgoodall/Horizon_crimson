//! Client side: what the player sees. The numbers are `crate::rise`'s; this
//! file only hands them to Horizon. The sky itself (moon, cracks, the eye) is
//! `sky_pass.rs`; this file also tells it the time, as the render thread has no host.

use crate::moon::{time_of_day, TICKS_PER_SECOND};
use crate::night::ECLIPSE_START;
use crate::night::{eclipse_seconds, presence};
use crate::rise::{frame, shake_angles, Frame};
use crate::sky::clouds;
use crate::server::Shared;
use crate::sound::{cues, Cue};
use horizon_client::fog::FogType;
use horizon_client::mod_api::{CameraShakeEvent, ComputeFogColorEvent, Host, RenderFogEvent};

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

/// Once a client tick: the sounds that start now, played at the player so
/// they are heard from anywhere, indoors too. They are the mod's own sounds
/// (`tools/make-sounds.py`, `assets/crimson_eclipse/sounds.json`).
pub fn tick(shared: &Shared, host: &mut dyn Host) {
    if !host.window() {
        return;
    }
    let Some(player) = host.player() else {
        shared.swap_sound_tick(None);
        return;
    };
    let day_time = host.day_time();
    if !shared.shows(day_time) {
        shared.swap_sound_tick(None);
        return;
    }
    let now = time_of_day(day_time);
    let Some(last) = shared.swap_sound_tick(Some(now)) else {
        return;
    };
    let at = [player.x, player.y, player.z];
    let mut play = |sound: &str, volume: f32, pitch: f32, delay: i32| {
        host.play_local_sound(sound, at, volume, pitch, delay);
    };
    let mut silence = None;
    for cue in cues(last, now) {
        match cue {
            Cue::Omen => play("crimson_eclipse:rise.omen", 1.0, 1.0, 0),
            Cue::Drone { volume } => play("crimson_eclipse:rise.drone", volume, 1.0, 0),
            Cue::Heartbeat { volume, pitch } => play("crimson_eclipse:rise.heartbeat", volume, pitch, 0),
            Cue::Silence { ticks } => silence = Some(ticks),
            Cue::Crack => {
                play("crimson_eclipse:rise.crack", 1.0, 1.0, 0);
                play("crimson_eclipse:rise.eye", 1.0, 1.0, 12);
            }
        }
    }
    // The crack front jumps, a slab comes loose or falls: its sound, a little higher or lower each time.
    if now > last && now - last <= 2 * TICKS_PER_SECOND {
        let seconds = |tick: i64| (tick - ECLIPSE_START) as f32 / TICKS_PER_SECOND as f32;
        for (i, k) in shared.shell(day_time).sounds_between(seconds(last), seconds(now)).enumerate() {
            let pitch = 0.85 + 0.3 * crate::rng::unit_of(crate::rng::mix(now as u64 + i as u64));
            play("crimson_eclipse:rise.fissure", (0.35 + 0.65 * k).min(1.0), pitch, 0);
        }
    }
    if let Some(ticks) = silence {
        host.muffle_sounds(0.95, 1.0, ticks, &[]);
    }
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

/// The vanilla clouds dissolve: the game fades them out toward the cloud fog's
/// end, so that distance is pulled to nothing while the blood moon is up.
pub fn render_fog(shared: &Shared, host: &dyn Host, event: &mut RenderFogEvent<'_>) {
    if !matches!(event.fog_type, FogType::Atmospheric) {
        return;
    }
    let Some((_, _, presence)) = now(shared, host, event.partial) else {
        return;
    };
    let left = clouds(presence);
    if left < 1.0 && event.fog.cloud_end.is_finite() {
        event.fog.cloud_end = (event.fog.cloud_end * left).max(0.01);
    }
}

/// The ground rumbles through the eclipse and jolts when the eye opens.
pub fn camera_shake(shared: &Shared, host: &dyn Host, event: &mut CameraShakeEvent<'_>) {
    let Some((seconds, frame, _)) = now(shared, host, event.partial) else {
        return;
    };
    // Each jump of the cracks, each slab falling, jolts the ground a little.
    let degrees = frame.shake_degrees + 0.4 * shared.shell(host.day_time()).flash(seconds);
    if degrees <= 0.0 {
        return;
    }
    let [pitch, yaw] = shake_angles(seconds, degrees);
    event.shake.pitch += pitch;
    event.shake.yaw += yaw;
}
