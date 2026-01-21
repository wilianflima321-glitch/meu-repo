#!/bin/bash
# =============================================================================
# AETHEL ENGINE - macOS Installer Script
# =============================================================================
#
# Instalador completo para macOS (Intel e Apple Silicon)
# 
# Features:
# - Detecção de arquitetura (x86_64/arm64)
# - Criação de Application Bundle (.app)
# - Instalação de dependências via Homebrew
# - Configuração de LaunchAgent
# - Integração com Spotlight
# - Geração de DMG para distribuição
# - Assinatura de código e notarização
#
# Uso:
#   ./macos-installer.sh [opções]
#
# Opções:
#   --install        Instalar aplicação
#   --uninstall      Remover aplicação
#   --create-dmg     Criar DMG para distribuição
#   --sign           Assinar código (requer Developer ID)
#   --notarize       Notarizar aplicação (requer Apple Developer)
#   --deps           Instalar apenas dependências
#   --dev            Modo desenvolvimento (não cria .app)
#   --help           Mostrar ajuda
#
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
APP_NAME="Aethel Engine"
APP_BUNDLE_ID="com.aethel.engine"
APP_VERSION="${VERSION:-1.0.0}"
INSTALL_DIR="/Applications"
DATA_DIR="$HOME/.aethel"
LOG_DIR="$DATA_DIR/logs"
CONFIG_DIR="$DATA_DIR/config"

# Arquitetura
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH_NAME="Apple Silicon"
    NODE_ARCH="arm64"
else
    ARCH_NAME="Intel"
    NODE_ARCH="x64"
fi

# =============================================================================
# FUNÇÕES UTILITÁRIAS
# =============================================================================

print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║     █████╗ ███████╗████████╗██╗  ██╗███████╗██╗                  ║"
    echo "║    ██╔══██╗██╔════╝╚══██╔══╝██║  ██║██╔════╝██║                  ║"
    echo "║    ███████║█████╗     ██║   ███████║█████╗  ██║                  ║"
    echo "║    ██╔══██║██╔══╝     ██║   ██╔══██║██╔══╝  ██║                  ║"
    echo "║    ██║  ██║███████╗   ██║   ██║  ██║███████╗███████╗             ║"
    echo "║    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝             ║"
    echo "║                                                                  ║"
    echo "║                    ENGINE - macOS Installer                      ║"
    echo "║                     Version: $APP_VERSION                            ║"
    echo "║                     Architecture: $ARCH_NAME                       ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

info() {
    echo -e "${BLUE}[i]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "Este script é apenas para macOS"
    fi
    
    # Verificar versão do macOS (mínimo 10.15 Catalina)
    MACOS_VERSION=$(sw_vers -productVersion)
    MAJOR_VERSION=$(echo "$MACOS_VERSION" | cut -d. -f1)
    
    if [ "$MAJOR_VERSION" -lt 10 ]; then
        error "macOS 10.15 ou superior é necessário"
    fi
    
    log "macOS $MACOS_VERSION detectado"
}

check_homebrew() {
    if ! command -v brew &> /dev/null; then
        warn "Homebrew não encontrado. Instalando..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Adicionar ao PATH
        if [ "$ARCH" = "arm64" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    log "Homebrew disponível"
}

# =============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# =============================================================================

install_dependencies() {
    info "Instalando dependências..."
    
    check_homebrew
    
    # Atualizar Homebrew
    brew update
    
    # Node.js
    if ! command -v node &> /dev/null; then
        info "Instalando Node.js..."
        brew install node@20
        brew link node@20 --force
    fi
    log "Node.js $(node --version)"
    
    # Blender
    if ! command -v blender &> /dev/null && [ ! -d "/Applications/Blender.app" ]; then
        info "Instalando Blender..."
        brew install --cask blender
    fi
    log "Blender instalado"
    
    # FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        info "Instalando FFmpeg..."
        brew install ffmpeg
    fi
    log "FFmpeg $(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3)"
    
    # Ollama (opcional)
    if ! command -v ollama &> /dev/null; then
        info "Instalando Ollama (IA local)..."
        brew install ollama
    fi
    log "Ollama instalado"
    
    # Git
    if ! command -v git &> /dev/null; then
        brew install git
    fi
    
    # Python (para scripts Blender)
    if ! command -v python3 &> /dev/null; then
        brew install python@3.11
    fi
    log "Python $(python3 --version | cut -d' ' -f2)"
    
    echo -e "\n${GREEN}✓ Todas as dependências instaladas!${NC}\n"
}

# =============================================================================
# CRIAÇÃO DO APPLICATION BUNDLE
# =============================================================================

create_app_bundle() {
    info "Criando Application Bundle..."
    
    APP_PATH="$INSTALL_DIR/$APP_NAME.app"
    CONTENTS="$APP_PATH/Contents"
    MACOS="$CONTENTS/MacOS"
    RESOURCES="$CONTENTS/Resources"
    
    # Remover versão anterior se existir
    if [ -d "$APP_PATH" ]; then
        warn "Removendo versão anterior..."
        rm -rf "$APP_PATH"
    fi
    
    # Criar estrutura de diretórios
    mkdir -p "$MACOS"
    mkdir -p "$RESOURCES"
    
    # Info.plist
    cat > "$CONTENTS/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>$APP_BUNDLE_ID</string>
    <key>CFBundleVersion</key>
    <string>$APP_VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$APP_VERSION</string>
    <key>CFBundleExecutable</key>
    <string>AethelEngine</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>AETH</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.developer-tools</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>LSUIElement</key>
    <false/>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeName</key>
            <string>Aethel Project</string>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>aethel</string>
                <string>aeth</string>
            </array>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
        </dict>
        <dict>
            <key>CFBundleTypeName</key>
            <string>3D Model</string>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>gltf</string>
                <string>glb</string>
                <string>fbx</string>
                <string>obj</string>
            </array>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
        </dict>
    </array>
    <key>UTExportedTypeDeclarations</key>
    <array>
        <dict>
            <key>UTTypeIdentifier</key>
            <string>com.aethel.project</string>
            <key>UTTypeDescription</key>
            <string>Aethel Engine Project</string>
            <key>UTTypeConformsTo</key>
            <array>
                <string>public.data</string>
            </array>
            <key>UTTypeTagSpecification</key>
            <dict>
                <key>public.filename-extension</key>
                <array>
                    <string>aethel</string>
                </array>
            </dict>
        </dict>
    </array>
</dict>
</plist>
EOF
    
    # Copiar arquivos da aplicação
    if [ -d "./dist" ]; then
        cp -R ./dist/* "$RESOURCES/"
    fi
    
    if [ -d "./node_modules" ]; then
        cp -R ./node_modules "$RESOURCES/"
    fi
    
    if [ -f "./package.json" ]; then
        cp ./package.json "$RESOURCES/"
    fi
    
    # Criar launcher script
    cat > "$MACOS/AethelEngine" << 'EOF'
#!/bin/bash

# Caminho do bundle
BUNDLE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES="$BUNDLE_DIR/Resources"

# Configurar ambiente
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export ELECTRON_IS_DEV=0
export AETHEL_HOME="$HOME/.aethel"
export NODE_ENV=production

# Verificar se é primeiro lançamento
if [ ! -d "$AETHEL_HOME" ]; then
    mkdir -p "$AETHEL_HOME"
    mkdir -p "$AETHEL_HOME/projects"
    mkdir -p "$AETHEL_HOME/cache"
    mkdir -p "$AETHEL_HOME/logs"
fi

# Iniciar aplicação
cd "$RESOURCES"

# Se tiver Electron
if [ -f "$RESOURCES/AethelEngine.app/Contents/MacOS/AethelEngine" ]; then
    exec "$RESOURCES/AethelEngine.app/Contents/MacOS/AethelEngine" "$@"
# Se for servidor web
elif [ -f "$RESOURCES/server/main.cjs" ]; then
    node "$RESOURCES/server/main.cjs" &
    SERVER_PID=$!
    sleep 2
    open "http://localhost:3000"
    wait $SERVER_PID
else
    # Fallback: abrir interface web
    open "http://localhost:3000"
fi
EOF
    
    chmod +x "$MACOS/AethelEngine"
    
    # Criar ícone (se não existir, criar placeholder)
    create_app_icon "$RESOURCES/AppIcon.icns"
    
    log "Application Bundle criado em $APP_PATH"
}

create_app_icon() {
    local ICON_PATH="$1"
    
    # Se já existir um ícone no projeto, usar ele
    if [ -f "./assets/icon.png" ]; then
        info "Convertendo ícone..."
        
        ICONSET="$TMPDIR/AppIcon.iconset"
        mkdir -p "$ICONSET"
        
        # Gerar todas as resoluções necessárias
        sips -z 16 16     "./assets/icon.png" --out "$ICONSET/icon_16x16.png" 2>/dev/null || true
        sips -z 32 32     "./assets/icon.png" --out "$ICONSET/icon_16x16@2x.png" 2>/dev/null || true
        sips -z 32 32     "./assets/icon.png" --out "$ICONSET/icon_32x32.png" 2>/dev/null || true
        sips -z 64 64     "./assets/icon.png" --out "$ICONSET/icon_32x32@2x.png" 2>/dev/null || true
        sips -z 128 128   "./assets/icon.png" --out "$ICONSET/icon_128x128.png" 2>/dev/null || true
        sips -z 256 256   "./assets/icon.png" --out "$ICONSET/icon_128x128@2x.png" 2>/dev/null || true
        sips -z 256 256   "./assets/icon.png" --out "$ICONSET/icon_256x256.png" 2>/dev/null || true
        sips -z 512 512   "./assets/icon.png" --out "$ICONSET/icon_256x256@2x.png" 2>/dev/null || true
        sips -z 512 512   "./assets/icon.png" --out "$ICONSET/icon_512x512.png" 2>/dev/null || true
        sips -z 1024 1024 "./assets/icon.png" --out "$ICONSET/icon_512x512@2x.png" 2>/dev/null || true
        
        iconutil -c icns "$ICONSET" -o "$ICON_PATH" 2>/dev/null || true
        rm -rf "$ICONSET"
    fi
    
    log "Ícone configurado"
}

# =============================================================================
# CRIAÇÃO DO DMG
# =============================================================================

create_dmg() {
    info "Criando DMG para distribuição..."
    
    DMG_NAME="${APP_NAME// /-}-$APP_VERSION-$ARCH.dmg"
    DMG_PATH="./dist/$DMG_NAME"
    STAGING_DIR="$TMPDIR/aethel-dmg-staging"
    
    # Criar diretório temporário
    rm -rf "$STAGING_DIR"
    mkdir -p "$STAGING_DIR"
    
    # Copiar app
    cp -R "$INSTALL_DIR/$APP_NAME.app" "$STAGING_DIR/"
    
    # Criar link para Applications
    ln -s /Applications "$STAGING_DIR/Applications"
    
    # Criar diretório dist se não existir
    mkdir -p ./dist
    
    # Remover DMG anterior se existir
    rm -f "$DMG_PATH"
    
    # Criar DMG
    hdiutil create \
        -volname "$APP_NAME" \
        -srcfolder "$STAGING_DIR" \
        -ov \
        -format UDZO \
        "$DMG_PATH"
    
    # Limpar
    rm -rf "$STAGING_DIR"
    
    log "DMG criado: $DMG_PATH"
    
    # Mostrar hash para verificação
    echo -e "\n${CYAN}SHA256:${NC}"
    shasum -a 256 "$DMG_PATH"
}

# =============================================================================
# ASSINATURA DE CÓDIGO
# =============================================================================

sign_app() {
    info "Assinando aplicação..."
    
    # Verificar se tem Developer ID
    if [ -z "$DEVELOPER_ID" ]; then
        DEVELOPER_ID=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')
    fi
    
    if [ -z "$DEVELOPER_ID" ]; then
        warn "Developer ID não encontrado. Use: export DEVELOPER_ID='Developer ID Application: Nome (ID)'"
        return 1
    fi
    
    APP_PATH="$INSTALL_DIR/$APP_NAME.app"
    
    # Criar entitlements
    ENTITLEMENTS="$TMPDIR/entitlements.plist"
    cat > "$ENTITLEMENTS" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
EOF
    
    # Assinar frameworks e helpers primeiro
    find "$APP_PATH" -type f \( -name "*.dylib" -o -name "*.so" -o -perm +111 \) -exec codesign --force --options runtime --entitlements "$ENTITLEMENTS" --sign "$DEVELOPER_ID" {} \; 2>/dev/null || true
    
    # Assinar o app bundle
    codesign --force --deep --options runtime --entitlements "$ENTITLEMENTS" --sign "$DEVELOPER_ID" "$APP_PATH"
    
    # Verificar assinatura
    codesign --verify --deep --strict "$APP_PATH"
    
    rm -f "$ENTITLEMENTS"
    
    log "Aplicação assinada com sucesso"
}

# =============================================================================
# NOTARIZAÇÃO
# =============================================================================

notarize_app() {
    info "Notarizando aplicação..."
    
    # Verificar credenciais
    if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$TEAM_ID" ]; then
        warn "Credenciais Apple não configuradas."
        echo "Configure as variáveis de ambiente:"
        echo "  export APPLE_ID='seu@email.com'"
        echo "  export APPLE_PASSWORD='app-specific-password'"
        echo "  export TEAM_ID='XXXXXXXXXX'"
        return 1
    fi
    
    # Criar ZIP para notarização
    ZIP_PATH="$TMPDIR/$APP_NAME.zip"
    ditto -c -k --keepParent "$INSTALL_DIR/$APP_NAME.app" "$ZIP_PATH"
    
    # Submeter para notarização
    xcrun notarytool submit "$ZIP_PATH" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait
    
    # Staple ticket
    xcrun stapler staple "$INSTALL_DIR/$APP_NAME.app"
    
    rm -f "$ZIP_PATH"
    
    log "Aplicação notarizada com sucesso"
}

# =============================================================================
# CONFIGURAÇÃO DO SISTEMA
# =============================================================================

configure_system() {
    info "Configurando sistema..."
    
    # Criar diretórios de dados
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$DATA_DIR/projects"
    mkdir -p "$DATA_DIR/cache"
    mkdir -p "$DATA_DIR/renders"
    
    # Criar configuração padrão
    if [ ! -f "$CONFIG_DIR/settings.json" ]; then
        cat > "$CONFIG_DIR/settings.json" << EOF
{
  "version": "$APP_VERSION",
  "theme": "dark",
  "language": "pt-BR",
  "paths": {
    "projects": "$DATA_DIR/projects",
    "cache": "$DATA_DIR/cache",
    "renders": "$DATA_DIR/renders"
  },
  "blender": {
    "path": "/Applications/Blender.app/Contents/MacOS/Blender"
  },
  "ai": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434"
  }
}
EOF
    fi
    
    # Criar LaunchAgent para auto-start do servidor (opcional)
    LAUNCH_AGENT="$HOME/Library/LaunchAgents/$APP_BUNDLE_ID.plist"
    cat > "$LAUNCH_AGENT" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$APP_BUNDLE_ID</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/$APP_NAME.app/Contents/MacOS/AethelEngine</string>
        <string>--background</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/stderr.log</string>
</dict>
</plist>
EOF
    
    # Registrar UTI
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$INSTALL_DIR/$APP_NAME.app" 2>/dev/null || true
    
    log "Sistema configurado"
}

# =============================================================================
# DESINSTALAÇÃO
# =============================================================================

uninstall() {
    info "Desinstalando $APP_NAME..."
    
    # Parar serviços
    launchctl unload "$HOME/Library/LaunchAgents/$APP_BUNDLE_ID.plist" 2>/dev/null || true
    
    # Remover Application Bundle
    if [ -d "$INSTALL_DIR/$APP_NAME.app" ]; then
        rm -rf "$INSTALL_DIR/$APP_NAME.app"
        log "Application Bundle removido"
    fi
    
    # Remover LaunchAgent
    rm -f "$HOME/Library/LaunchAgents/$APP_BUNDLE_ID.plist"
    
    # Perguntar sobre dados do usuário
    echo ""
    read -p "Remover dados do usuário em $DATA_DIR? [s/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm -rf "$DATA_DIR"
        log "Dados do usuário removidos"
    else
        info "Dados do usuário mantidos em $DATA_DIR"
    fi
    
    # Limpar cache do Launch Services
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user 2>/dev/null || true
    
    echo -e "\n${GREEN}✓ $APP_NAME desinstalado com sucesso!${NC}\n"
}

# =============================================================================
# INSTALAÇÃO COMPLETA
# =============================================================================

full_install() {
    print_banner
    check_macos
    
    echo -e "\n${CYAN}Iniciando instalação do $APP_NAME...${NC}\n"
    
    install_dependencies
    create_app_bundle
    configure_system
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║     ✓ Instalação concluída com sucesso!                         ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║     Abra $APP_NAME em /Applications                        ║${NC}"
    echo -e "${GREEN}║     ou execute: open '$INSTALL_DIR/$APP_NAME.app'              ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}\n"
}

# =============================================================================
# AJUDA
# =============================================================================

show_help() {
    print_banner
    echo "Uso: $0 [opção]"
    echo ""
    echo "Opções:"
    echo "  --install        Instalação completa (padrão)"
    echo "  --uninstall      Desinstalar aplicação"
    echo "  --create-dmg     Criar DMG para distribuição"
    echo "  --sign           Assinar código (requer Developer ID)"
    echo "  --notarize       Notarizar aplicação (requer Apple Developer)"
    echo "  --deps           Instalar apenas dependências"
    echo "  --dev            Modo desenvolvimento"
    echo "  --help           Mostrar esta ajuda"
    echo ""
    echo "Variáveis de ambiente:"
    echo "  VERSION          Versão da aplicação (padrão: 1.0.0)"
    echo "  DEVELOPER_ID     ID do desenvolvedor para assinatura"
    echo "  APPLE_ID         Email da conta Apple Developer"
    echo "  APPLE_PASSWORD   App-specific password"
    echo "  TEAM_ID          Team ID da conta Apple Developer"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

case "${1:-}" in
    --install)
        full_install
        ;;
    --uninstall)
        print_banner
        uninstall
        ;;
    --create-dmg)
        print_banner
        create_dmg
        ;;
    --sign)
        print_banner
        sign_app
        ;;
    --notarize)
        print_banner
        notarize_app
        ;;
    --deps)
        print_banner
        install_dependencies
        ;;
    --dev)
        print_banner
        check_macos
        install_dependencies
        info "Modo desenvolvimento - execute: npm run dev"
        ;;
    --help|-h)
        show_help
        ;;
    "")
        full_install
        ;;
    *)
        error "Opção desconhecida: $1\nUse --help para ver opções disponíveis"
        ;;
esac

exit 0
