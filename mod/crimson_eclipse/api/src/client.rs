//! Client side: what the player sees. The numbers are `crate::rise`'s; this
//! file only hands them to Horizon. The sky itself (moon, cracks, the eye) is
//! `sky_pass.rs`; this file also tells it the time, as the render thread has no host.

use crate::moon::time_of_day;
use crate::night::{eclipse_seconds, presence};
use crate::rise::{frame, shake_angles, Frame};
use crate::server::Shared;
use crate::sound::{cues, Cue};
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

/// Once a client tick: the sounds that start now, played at the player so
/// they are heard from anywhere, indoors too. They are the game's own sound
/// events, named and pitched down: stand-ins until the mod has its own.
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
            Cue::Omen => play("minecraft:entity.warden.nearby_closer", 1.0, 0.5, 0),
            Cue::Drone { volume } => {
                play("minecraft:block.portal.ambient", 0.9 * volume, 0.5, 0);
                play("minecraft:block.beacon.ambient", 1.2 * volume, 0.5, 0);
            }
            Cue::Heartbeat { volume, pitch } => play("minecraft:entity.warden.heartbeat", 2.0 * volume, pitch, 0),
            Cue::Silence { ticks } => silence = Some(ticks),
            Cue::Crack => {
                play("minecraft:block.glass.break", 2.0, 0.5, 0);
                play("minecraft:entity.lightning_bolt.thunder", 2.0, 0.6, 0);
                play("minecraft:block.end_portal.spawn", 1.0, 0.7, 0);
                // The echoes, then the eye.
                play("minecraft:entity.lightning_bolt.thunder", 1.0, 0.5, 14);
                play("minecraft:entity.lightning_bolt.thunder", 0.5, 0.5, 30);
                play("minecraft:entity.ender_dragon.growl", 1.5, 0.5, 20);
            }
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
