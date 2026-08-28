//! Data-Oriented Gameplay Ability System (GAS) module.
//!
//! S5.0/S5.4 additions (letters **lk**/**ll**): the cooked CAS data-asset
//! registry (`data_assets`) and the rule-based State Tree runtime (`state_tree`)
//! compose on the substrate below without altering its mathematical invariants.

pub mod abilities;
pub mod attributes;
pub mod binary_ipc_tick;
pub mod data_assets;
pub mod driver;
pub mod runtime;
pub mod effects;
pub mod fixtures;
pub mod interrupts;
pub mod replication;
pub mod rollback;
pub mod state_tree;
pub mod tags;
pub mod unified_id;
pub mod duplex;
pub mod world;

pub use abilities::*;
pub use attributes::*;
pub use binary_ipc_tick::*;
pub use data_assets::*;
pub use driver::*;
pub use runtime::*;
pub use effects::*;
pub use fixtures::*;
pub use interrupts::*;
pub use replication::*;
pub use rollback::*;
pub use state_tree::*;
pub use tags::*;
pub use unified_id::*;
pub use duplex::*;
pub use world::*;
