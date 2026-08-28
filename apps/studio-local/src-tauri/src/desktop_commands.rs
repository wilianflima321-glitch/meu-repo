//! Studio Local Desktop IPC commands facade.
//! Modularized under `src/desktop/` for clean maintainability (V36 Audit).

#[path = "desktop/mod.rs"]
pub mod desktop;
pub use desktop::*;

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    fn test_workspace(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let root = env::current_dir()
            .expect("current dir is available")
            .join("desktop-command-tests")
            .join(format!("{name}-{nonce}"));
        fs::create_dir_all(&root).expect("test workspace created");
        root
    }

    #[test]
    fn filesystem_guards_scope_reads_writes_and_listing_to_the_project_root() {
        let root = test_workspace("filesystem");
        let file = root.join("note.txt");

        let write_path = ensure_allowed_write_path(&file.display().to_string(), Some(&root))
            .expect("write path allowed inside project root");
        fs::write(&write_path, "hello from Studio Local").expect("write allowed file");

        let read_path = ensure_allowed_existing_path(&file.display().to_string(), Some(&root))
            .expect("read path allowed inside project root");
        let contents = fs::read_to_string(&read_path).expect("read allowed file");
        assert_eq!(contents, "hello from Studio Local");

        let entries = fs_list_at(&root, Some(&root)).expect("list allowed directory");
        assert!(entries
            .iter()
            .any(|entry| entry.path.ends_with("note.txt") && entry.entry_type == "file"));

        let protected_dir = root.join(".git");
        fs::create_dir_all(&protected_dir).expect("protected dir created");
        let protected_file = protected_dir.join("config");
        fs::write(&protected_file, "secret").expect("protected file created");
        let error = ensure_allowed_existing_path(&protected_file.display().to_string(), Some(&root))
            .expect_err("protected path is blocked");
        assert!(error.contains("protected workspace internals"));

        let outside = env::temp_dir().join(format!(
            "aethel-studio-local-outside-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        fs::write(&outside, "should not be reachable").expect("outside file created");
        let outside_error = ensure_allowed_existing_path(&outside.display().to_string(), Some(&root))
            .expect_err("path outside the project root is blocked");
        assert!(outside_error.contains("outside Studio Local allowed roots"));

        let _ = fs::remove_file(outside);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn fs_tree_builds_a_nested_listing_bounded_by_depth() {
        let root = test_workspace("tree");
        fs::create_dir_all(root.join("nested/deeper")).expect("nested dirs created");
        fs::write(root.join("top.txt"), "top").expect("top file created");
        fs::write(root.join("nested/mid.txt"), "mid").expect("mid file created");
        fs::write(root.join("nested/deeper/leaf.txt"), "leaf").expect("leaf file created");

        let shallow = walk_tree(&root, 1).expect("shallow tree walk");
        let nested_dir = shallow
            .iter()
            .find(|node| node.name == "nested")
            .expect("nested directory present");
        let nested_children = nested_dir
            .children
            .as_ref()
            .expect("nested directory expanded at depth 1");
        assert!(nested_children.iter().any(|node| node.name == "mid.txt"));
        let deeper_dir = nested_children
            .iter()
            .find(|node| node.name == "deeper")
            .expect("deeper directory listed");
        assert!(
            deeper_dir.children.is_none(),
            "depth budget exhausted before expanding 'deeper'"
        );

        let _ = fs::remove_dir_all(root);
    }

    fn fs_list_at(path: &Path, project_root: Option<&Path>) -> Result<Vec<FileEntry>, String> {
        let path = ensure_allowed_existing_path(&path.display().to_string(), project_root)?;
        let mut entries = Vec::new();
        for entry in fs::read_dir(&path).map_err(|error| format!("failed to list directory: {error}"))? {
            let entry = entry.map_err(|error| format!("failed to inspect directory entry: {error}"))?;
            let entry_path = entry.path();
            if has_denied_segment(&entry_path) {
                continue;
            }
            let metadata = entry
                .metadata()
                .map_err(|error| format!("failed to inspect directory entry: {error}"))?;
            entries.push(FileEntry {
                path: entry_path.display().to_string(),
                entry_type: if metadata.is_dir() { "folder".to_string() } else { "file".to_string() },
            });
        }
        entries.sort_by(|left, right| left.path.cmp(&right.path));
        Ok(entries)
    }

    #[test]
    fn terminal_write_and_close_fail_for_unknown_session() {
        let mut store = TerminalSessionStore::default();

        let write_error = store
            .write_held("missing-session", "echo 42\n")
            .expect_err("writing to an unknown session must fail");
        assert!(write_error.contains("was not found"));

        let close_error = store
            .close("missing-session")
            .expect_err("closing an unknown session must fail");
        assert!(close_error.contains("was not found"));

        let resize_error = store
            .resize_held("missing-session", 40, 120)
            .expect_err("resizing an unknown session must fail");
        assert!(resize_error.contains("was not found"));
    }

    #[test]
    fn terminal_acl_refuses_agent_callers_with_law_48_evidence() {
        let agent = TerminalCallerMeta {
            caller_kind: Some("agent".into()),
            ..Default::default()
        };
        let err = enforce_human_terminal_acl(&agent).expect_err("agent denied");
        let ipc = err.to_ipc_error();
        assert!(ipc.starts_with(AGENT_HOST_PTY_DENY_CODE));
        assert!(ipc.contains("\"law\":48"));
        assert!(ipc.contains("desktop-native-pty"));

        let user = TerminalCallerMeta {
            caller_kind: Some("user".into()),
            ..Default::default()
        };
        assert!(enforce_human_terminal_acl(&user).is_ok());
    }

    #[test]
    fn ai_completion_stays_provider_unavailable_until_sidecar_exists() {
        let response = ai_complete(
            "draft a plan".to_string(),
            Some("local-fixture".to_string()),
            None,
            None,
            None,
        );
        assert_eq!(response.state, "provider_unavailable");
        assert_eq!(response.cost_usd, Some(0.0));
        assert!(response.text.is_empty());
        assert!(response.reason.contains("Local AI completion is not wired"));
    }

    #[test]
    fn ai_completion_refuses_agent_callers_with_law_48_evidence() {
        let response = ai_complete(
            "draft a plan".to_string(),
            Some("local-fixture".to_string()),
            Some("agent".to_string()),
            None,
            None,
        );
        assert_eq!(response.state, "denied");
        assert_eq!(response.cost_usd, Some(0.0));
        assert!(response.text.is_empty());
        assert!(response.reason.starts_with(AGENT_HOST_PTY_DENY_CODE));
        assert!(response.reason.contains("\"law\":48"));
    }

    #[test]
    fn project_root_state_round_trips_for_host_disk_explorer() {
        let root = test_workspace("project-root");
        let state = ProjectRootState::default();
        {
            let guard = state.0.lock().expect("lock");
            assert!(guard.is_none());
        }
        {
            let mut guard = state.0.lock().expect("lock");
            *guard = Some(root.clone());
        }
        {
            let guard = state.0.lock().expect("lock");
            assert_eq!(
                guard.as_ref().map(|p| p.display().to_string()),
                Some(root.display().to_string())
            );
        }
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn native_notification_reports_provider_unavailable_without_plugin() {
        let response = notify_native(
            NativeNotificationInput {
                title: "Aethel".to_string(),
                body: Some("hello".to_string()),
                tone: Some("info".to_string()),
            },
            None,
            None,
            None,
        );
        assert_eq!(response.state, "provider_unavailable");
        assert!(response
            .reason
            .contains("Native notification plugin is not installed"));
    }
}
