//! The hook layer: it hands each Horizon hook to the file that handles it and
//! decides nothing. Written by hand, like `server.rs`, `client.rs` and `sky_pass.rs`; the
//! rest of `src/` is copied from `crates/crimson-core` by the build.

use crate::client;
use crate::server::{self, Shared};
use crate::sky_pass::Sky;
use horizon_client::mod_api::{
    CameraShakeEvent, ComputeFogColorEvent, Flow, Hooks, Host, LevelTickPostEvent,
    PerformCommandEvent, RegisterCommandsEvent, RenderHooks,
};
use std::sync::Arc;

/// The entry point the launcher calls.
pub fn hooks() -> Box<dyn Hooks> {
    let shared = Arc::new(Shared::default());
    Box::new(CrimsonEclipse {
        sky: Sky::new(shared.clone()),
        shared,
    })
}

/// One instance serves the window's game and the single player server.
struct CrimsonEclipse {
    shared: Arc<Shared>,
    sky: Sky,
}

impl Hooks for CrimsonEclipse {
    fn render(&self) -> Option<&dyn RenderHooks> {
        Some(&self.sky)
    }

    fn register_commands(&self, _host: &mut dyn Host, event: &mut RegisterCommandsEvent<'_>) {
        server::register_commands(event);
    }

    fn perform_command(&self, host: &mut dyn Host, event: &mut PerformCommandEvent<'_>) -> Flow {
        server::perform_command(&self.shared, host, event)
    }

    fn level_tick_post(&self, host: &mut dyn Host, event: &mut LevelTickPostEvent<'_>) {
        server::level_tick_post(&self.shared, host, event.dimension);
    }

    fn compute_fog_color(&self, host: &dyn Host, event: &mut ComputeFogColorEvent<'_>) {
        client::compute_fog_color(&self.shared, host, event);
    }

    fn camera_shake(&self, host: &dyn Host, event: &mut CameraShakeEvent<'_>) {
        client::camera_shake(&self.shared, host, event);
    }
}
