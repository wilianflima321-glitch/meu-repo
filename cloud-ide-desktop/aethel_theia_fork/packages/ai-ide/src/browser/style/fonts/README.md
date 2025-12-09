# Local Fonts Directory

This directory contains locally bundled fonts for offline use (no CDN dependencies).

## Required Font Files

To complete the font setup, add the following files to this directory:

### Inter (UI Font)
- `inter-regular.woff2` / `inter-regular.woff`
- `inter-medium.woff2` / `inter-medium.woff`
- `inter-semibold.woff2` / `inter-semibold.woff`
- `inter-bold.woff2` / `inter-bold.woff`

Source: https://github.com/rsms/inter/releases

### JetBrains Mono (Code Font)
- `jetbrains-mono-regular.woff2` / `jetbrains-mono-regular.woff`
- `jetbrains-mono-semibold.woff2` / `jetbrains-mono-semibold.woff`

Source: https://github.com/JetBrains/JetBrainsMono/releases

### Codicons (Icon Font)
- `codicon.ttf`

Source: https://github.com/microsoft/vscode-codicons/tree/main/dist

## Installation

```bash
# Download Inter
curl -L https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip -o inter.zip
unzip inter.zip -d inter
cp inter/Inter\ Desktop/*.woff* .

# Download JetBrains Mono
curl -L https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip -o jbm.zip
unzip jbm.zip -d jbm
cp jbm/fonts/webfonts/*.woff* .

# Download Codicons
curl -L https://raw.githubusercontent.com/microsoft/vscode-codicons/main/dist/codicon.ttf -o codicon.ttf
```

## Fallback Behavior

If font files are not present, the CSS will fall back to system fonts:
- Inter → Segoe UI, Roboto, Helvetica Neue, Arial
- JetBrains Mono → Fira Code, Consolas, Courier New
- Codicons → Unicode symbols (degraded experience)

## License Notes

- **Inter**: SIL Open Font License 1.1
- **JetBrains Mono**: SIL Open Font License 1.1
- **Codicons**: CC-BY-4.0

Ensure compliance with these licenses when distributing the bundled fonts.
