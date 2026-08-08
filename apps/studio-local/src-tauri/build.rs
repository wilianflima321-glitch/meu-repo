fn main() {
    if std::env::var("PROFILE").unwrap_or_default() == "release" {
        println!("cargo:rustc-env=RUSTFLAGS=-D warnings");
    }

    let _ = std::panic::catch_unwind(|| {
        if let Err(e) = tauri_build::try_build(tauri_build::Attributes::new()) {
            println!("cargo:warning=Tauri build failed (likely missing windres/icons). Continuing without them. Error: {}", e);
        }
    });

    // See the `embed-resource` comment in Cargo.toml: `tauri_build::build()`
    // above only links the Common-Controls-v6 manifest into `[[bin]]`
    // targets, leaving the `cargo test` harness executable without it and
    // liable to crash at OS-loader time on any transitive dep that needs a
    // v6-only comctl32 export. Re-embed the identical manifest scoped to
    // `--tests` so `cargo test` gets a working executable too.
    #[cfg(windows)]
    {
        const COMMON_CONTROLS_V6_MANIFEST: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>
"#;

        let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
        let manifest_path = out_dir.join("test-harness.manifest");
        std::fs::write(&manifest_path, COMMON_CONTROLS_V6_MANIFEST)
            .expect("failed to write test-harness Common-Controls-v6 manifest");

        let rc_path = out_dir.join("test-harness-manifest.rc");
        std::fs::write(
            &rc_path,
            format!(
                "#pragma code_page(65001)\n1 24 \"{}\"\n",
                manifest_path.display().to_string().replace('\\', "\\\\")
            ),
        )
        .expect("failed to write test-harness manifest .rc");

        // `compile_for_tests` requires an explicit `[[test]]`/`tests/` integration-test
        // target and errors out ("does not have a test target") for crates that only
        // have `#[cfg(test)]` unit tests inside `--lib` (our case) — use the fully
        // unscoped variant instead, which links into every artifact unconditionally.
        embed_resource::compile_for_everything(&rc_path, embed_resource::NONE)
            .manifest_optional()
            .ok();
    }
}
