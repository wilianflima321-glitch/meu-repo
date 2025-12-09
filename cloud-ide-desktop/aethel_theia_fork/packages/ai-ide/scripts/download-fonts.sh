#!/bin/bash
# Download and install fonts for AI IDE
# Run from package root: bash scripts/download-fonts.sh

set -e

FONTS_DIR="src/browser/style/fonts"
TEMP_DIR="/tmp/ai-ide-fonts"

echo "📦 Downloading fonts for AI IDE..."

# Create directories
mkdir -p "$FONTS_DIR"
mkdir -p "$TEMP_DIR"

# Download Inter
echo "⬇️  Downloading Inter font..."
curl -L "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" -o "$TEMP_DIR/inter.zip"
unzip -q "$TEMP_DIR/inter.zip" -d "$TEMP_DIR/inter"

# Copy Inter WOFF2 files
echo "📋 Copying Inter files..."
cp "$TEMP_DIR/inter/Inter Desktop/Inter-Regular.woff2" "$FONTS_DIR/inter-regular.woff2" 2>/dev/null || \
cp "$TEMP_DIR/inter/Inter Web/Inter-Regular.woff2" "$FONTS_DIR/inter-regular.woff2" || \
echo "⚠️  Inter Regular not found"

cp "$TEMP_DIR/inter/Inter Desktop/Inter-Medium.woff2" "$FONTS_DIR/inter-medium.woff2" 2>/dev/null || \
cp "$TEMP_DIR/inter/Inter Web/Inter-Medium.woff2" "$FONTS_DIR/inter-medium.woff2" || \
echo "⚠️  Inter Medium not found"

cp "$TEMP_DIR/inter/Inter Desktop/Inter-SemiBold.woff2" "$FONTS_DIR/inter-semibold.woff2" 2>/dev/null || \
cp "$TEMP_DIR/inter/Inter Web/Inter-SemiBold.woff2" "$FONTS_DIR/inter-semibold.woff2" || \
echo "⚠️  Inter SemiBold not found"

cp "$TEMP_DIR/inter/Inter Desktop/Inter-Bold.woff2" "$FONTS_DIR/inter-bold.woff2" 2>/dev/null || \
cp "$TEMP_DIR/inter/Inter Web/Inter-Bold.woff2" "$FONTS_DIR/inter-bold.woff2" || \
echo "⚠️  Inter Bold not found"

# Download JetBrains Mono
echo "⬇️  Downloading JetBrains Mono font..."
curl -L "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip" -o "$TEMP_DIR/jbm.zip"
unzip -q "$TEMP_DIR/jbm.zip" -d "$TEMP_DIR/jbm"

# Copy JetBrains Mono WOFF2 files
echo "📋 Copying JetBrains Mono files..."
cp "$TEMP_DIR/jbm/fonts/webfonts/JetBrainsMono-Regular.woff2" "$FONTS_DIR/jetbrains-mono-regular.woff2" 2>/dev/null || \
echo "⚠️  JetBrains Mono Regular not found"

cp "$TEMP_DIR/jbm/fonts/webfonts/JetBrainsMono-SemiBold.woff2" "$FONTS_DIR/jetbrains-mono-semibold.woff2" 2>/dev/null || \
echo "⚠️  JetBrains Mono SemiBold not found"

# Download Codicons
echo "⬇️  Downloading Codicons font..."
curl -L "https://raw.githubusercontent.com/microsoft/vscode-codicons/main/dist/codicon.ttf" -o "$FONTS_DIR/codicon.ttf"

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

# Verify files
echo ""
echo "✅ Font installation complete!"
echo ""
echo "Installed files:"
ls -lh "$FONTS_DIR"

echo ""
echo "📊 Total size:"
du -sh "$FONTS_DIR"

echo ""
echo "✨ Fonts are ready for offline use!"
