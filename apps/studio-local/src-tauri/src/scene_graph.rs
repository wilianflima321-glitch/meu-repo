//! Native, engine-authoritative scene graph (Tarefa 1 — O Coração da IDE,
//! Desktop counterpart).
//!
//! The web `WebIDEBackend` (`web/lib/ide/WebIDEBackend.ts`) reads/writes
//! `useViewportStore`, a Zustand store living entirely in JS. The desktop
//! shell has no such store — and per the "Motor Gráfico Fractal" direction
//! (the engine should eventually run standalone inside an exported game for
//! UGC modding, not just inside a browser tab), the scene graph belongs in
//! the native engine process, not in whatever UI toolkit happens to be
//! drawing panels around it that day.
//!
//! So this module is the real source of truth: `SceneGraphState` is managed
//! Tauri state (a plain in-memory store today; the natural place to later
//! swap in the actual ECS `World` transform components once viewport
//! rendering is wired to this same graph). Every mutation emits
//! `scene_graph_changed` so any number of windows/panels — including a
//! future undocked Outliner window (Missão Suprema 1) — can subscribe and
//! stay in sync without polling.
use std::collections::BTreeMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

pub const SCENE_GRAPH_CHANGED_EVENT: &str = "scene_graph_changed";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneNode {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub visible: bool,
    pub locked: bool,
    /// Parent node id — `None` = scene root. Flat list stays authoritative;
    /// UI builds a tree for Outliner3D from this field.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    pub position: [f32; 3],
    pub rotation: [f32; 3],
    pub scale: [f32; 3],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geometry: Option<String>,
}

impl SceneNode {
    fn new(id: String, name: String, node_type: String) -> Self {
        Self {
            id,
            name,
            node_type,
            visible: true,
            locked: false,
            parent_id: None,
            position: [0.0, 0.0, 0.0],
            rotation: [0.0, 0.0, 0.0],
            scale: [1.0, 1.0, 1.0],
            color: None,
            geometry: None,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneNodeTransformPatch {
    pub position: Option<[f32; 3]>,
    pub rotation: Option<[f32; 3]>,
    pub scale: Option<[f32; 3]>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneGraphSnapshot {
    pub nodes: Vec<SceneNode>,
    pub selected_ids: Vec<String>,
}

/// Insertion-ordered so `scene_get_nodes` returns a stable Outliner order
/// instead of BTreeMap's alphabetical-by-id shuffling every time a node is
/// added.
#[derive(Default)]
pub struct SceneGraphState {
    nodes: BTreeMap<String, SceneNode>,
    order: Vec<String>,
    selected_ids: Vec<String>,
    next_id: u64,
}

impl SceneGraphState {
    fn snapshot(&self) -> SceneGraphSnapshot {
        SceneGraphSnapshot {
            nodes: self
                .order
                .iter()
                .filter_map(|id| self.nodes.get(id).cloned())
                .collect(),
            selected_ids: self.selected_ids.clone(),
        }
    }
}

fn lock<'a>(state: &'a State<'a, Mutex<SceneGraphState>>) -> Result<std::sync::MutexGuard<'a, SceneGraphState>, String> {
    state.lock().map_err(|_| "Studio Local scene graph lock is poisoned.".to_string())
}

fn broadcast(app_handle: &AppHandle, state: &SceneGraphState) {
    let _ = app_handle.emit(SCENE_GRAPH_CHANGED_EVENT, state.snapshot());
}

#[tauri::command]
pub fn scene_get_nodes(state: State<'_, Mutex<SceneGraphState>>) -> Result<SceneGraphSnapshot, String> {
    Ok(lock(&state)?.snapshot())
}

#[tauri::command]
pub fn scene_select(
    ids: Vec<String>,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    guard.selected_ids = ids;
    broadcast(&app_handle, &guard);
    Ok(())
}

#[tauri::command]
pub fn scene_set_visible(
    id: String,
    visible: bool,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    let node = guard
        .nodes
        .get_mut(&id)
        .ok_or_else(|| format!("Studio Local scene node not found: {id}"))?;
    node.visible = visible;
    broadcast(&app_handle, &guard);
    Ok(())
}

#[tauri::command]
pub fn scene_set_locked(
    id: String,
    locked: bool,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    let node = guard
        .nodes
        .get_mut(&id)
        .ok_or_else(|| format!("Studio Local scene node not found: {id}"))?;
    node.locked = locked;
    broadcast(&app_handle, &guard);
    Ok(())
}

#[tauri::command]
pub fn scene_update_transform(
    id: String,
    patch: SceneNodeTransformPatch,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    let node = guard
        .nodes
        .get_mut(&id)
        .ok_or_else(|| format!("Studio Local scene node not found: {id}"))?;
    if let Some(position) = patch.position {
        node.position = position;
    }
    if let Some(rotation) = patch.rotation {
        node.rotation = rotation;
    }
    if let Some(scale) = patch.scale {
        node.scale = scale;
    }
    broadcast(&app_handle, &guard);
    Ok(())
}

#[tauri::command]
pub fn scene_add_node(
    name: String,
    node_type: String,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<SceneNode, String> {
    let mut guard = lock(&state)?;
    guard.next_id += 1;
    let id = format!("native-node-{}", guard.next_id);
    let node = SceneNode::new(id.clone(), name, node_type);
    guard.nodes.insert(id.clone(), node.clone());
    guard.order.push(id);
    broadcast(&app_handle, &guard);
    Ok(node)
}

#[tauri::command]
pub fn scene_remove_node(
    id: String,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    if guard.nodes.remove(&id).is_none() {
        return Err(format!("Studio Local scene node not found: {id}"));
    }
    guard.order.retain(|existing| existing != &id);
    guard.selected_ids.retain(|existing| existing != &id);
    // Orphan children to root — fail-closed (no silent delete cascade).
    for node in guard.nodes.values_mut() {
        if node.parent_id.as_deref() == Some(id.as_str()) {
            node.parent_id = None;
        }
    }
    broadcast(&app_handle, &guard);
    Ok(())
}

/// Reparent `id` under `parent_id` (`None` → scene root). Rejects missing
/// nodes, self-parent, and cycles so the Outliner tree stays acyclic.
#[tauri::command]
pub fn scene_reparent(
    id: String,
    parent_id: Option<String>,
    state: State<'_, Mutex<SceneGraphState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut guard = lock(&state)?;
    if !guard.nodes.contains_key(&id) {
        return Err(format!("Studio Local scene node not found: {id}"));
    }
    if let Some(ref pid) = parent_id {
        if pid == &id {
            return Err("Studio Local scene reparent refused: cannot parent a node to itself.".to_string());
        }
        if !guard.nodes.contains_key(pid) {
            return Err(format!("Studio Local scene parent not found: {pid}"));
        }
        // Walk ancestors of the proposed parent; if we hit `id`, this is a cycle.
        let mut cursor = Some(pid.clone());
        while let Some(current) = cursor {
            if current == id {
                return Err(
                    "Studio Local scene reparent refused: would create a parent cycle.".to_string(),
                );
            }
            cursor = guard.nodes.get(&current).and_then(|n| n.parent_id.clone());
        }
    }
    let node = guard
        .nodes
        .get_mut(&id)
        .ok_or_else(|| format!("Studio Local scene node not found: {id}"))?;
    node.parent_id = parent_id;
    broadcast(&app_handle, &guard);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adding_and_removing_nodes_keeps_order_and_selection_consistent() {
        let mut state = SceneGraphState::default();
        state.next_id += 1;
        let id_a = format!("native-node-{}", state.next_id);
        state.nodes.insert(id_a.clone(), SceneNode::new(id_a.clone(), "Cube".to_string(), "mesh".to_string()));
        state.order.push(id_a.clone());

        state.next_id += 1;
        let id_b = format!("native-node-{}", state.next_id);
        state.nodes.insert(id_b.clone(), SceneNode::new(id_b.clone(), "Light".to_string(), "light".to_string()));
        state.order.push(id_b.clone());

        state.selected_ids = vec![id_a.clone()];

        let snapshot = state.snapshot();
        assert_eq!(snapshot.nodes.len(), 2);
        assert_eq!(snapshot.nodes[0].name, "Cube");
        assert_eq!(snapshot.nodes[1].name, "Light");
        assert_eq!(snapshot.selected_ids, vec![id_a.clone()]);

        state.nodes.remove(&id_a);
        state.order.retain(|existing| existing != &id_a);
        state.selected_ids.retain(|existing| existing != &id_a);

        let after_removal = state.snapshot();
        assert_eq!(after_removal.nodes.len(), 1);
        assert_eq!(after_removal.nodes[0].name, "Light");
        assert!(after_removal.selected_ids.is_empty());
    }

    #[test]
    fn reparent_rejects_cycles_and_orphans_on_remove() {
        let mut state = SceneGraphState::default();
        state.next_id += 1;
        let id_a = format!("native-node-{}", state.next_id);
        state
            .nodes
            .insert(id_a.clone(), SceneNode::new(id_a.clone(), "Root".into(), "group".into()));
        state.order.push(id_a.clone());

        state.next_id += 1;
        let id_b = format!("native-node-{}", state.next_id);
        let mut child = SceneNode::new(id_b.clone(), "Child".into(), "mesh".into());
        child.parent_id = Some(id_a.clone());
        state.nodes.insert(id_b.clone(), child);
        state.order.push(id_b.clone());

        // Cycle: parent A under B while B already under A.
        let mut cursor = Some(id_b.clone());
        let mut would_cycle = false;
        while let Some(current) = cursor {
            if current == id_a {
                would_cycle = true;
                break;
            }
            cursor = state.nodes.get(&current).and_then(|n| n.parent_id.clone());
        }
        assert!(would_cycle, "walking B's ancestors must hit A");

        // Remove parent → orphan child to root.
        state.nodes.remove(&id_a);
        state.order.retain(|existing| existing != &id_a);
        for node in state.nodes.values_mut() {
            if node.parent_id.as_deref() == Some(id_a.as_str()) {
                node.parent_id = None;
            }
        }
        assert_eq!(state.nodes.get(&id_b).and_then(|n| n.parent_id.clone()), None);
    }

    #[test]
    fn transform_patch_only_overwrites_provided_fields() {
        let mut node = SceneNode::new("node-1".to_string(), "Cube".to_string(), "mesh".to_string());
        node.position = [1.0, 2.0, 3.0];
        node.scale = [2.0, 2.0, 2.0];

        let patch = SceneNodeTransformPatch {
            position: Some([9.0, 9.0, 9.0]),
            rotation: None,
            scale: None,
        };

        if let Some(position) = patch.position {
            node.position = position;
        }
        if let Some(rotation) = patch.rotation {
            node.rotation = rotation;
        }
        if let Some(scale) = patch.scale {
            node.scale = scale;
        }

        assert_eq!(node.position, [9.0, 9.0, 9.0]);
        assert_eq!(node.scale, [2.0, 2.0, 2.0], "untouched fields must survive a partial patch");
    }
}
