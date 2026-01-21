#!/bin/bash
# ==============================================================================
# AETHEL ENGINE - Linux Installation Script
# ==============================================================================
#
# Script para instalar o Aethel Engine em sistemas Linux.
# Suporta: Ubuntu/Debian, Fedora/RHEL, Arch Linux
#
# Uso: 
#   sudo ./install-aethel.sh                    # Instalação padrão
#   sudo ./install-aethel.sh --prefix=/opt     # Diretório customizado
#   ./install-aethel.sh --user                  # Instalação local (sem sudo)
#

set -e

# ==============================================================================
# CONFIGURATION
# ==============================================================================

APP_NAME="Aethel Engine"
APP_ID="aethel-engine"
VERSION="${AETHEL_VERSION:-1.0.0}"
ARCH="$(uname -m)"

# Installation paths
PREFIX="/opt/aethel-engine"
BIN_DIR="/usr/local/bin"
DESKTOP_DIR="/usr/share/applications"
ICON_DIR="/usr/share/icons/hicolor"
USER_INSTALL=false

# Dependencies
DEPS_APT="nodejs npm git curl wget libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libsecret-1-0 libappindicator3-1"
DEPS_DNF="nodejs npm git curl wget gtk3 libnotify nss libXScrnSaver libXtst xdg-utils libsecret libappindicator"
DEPS_PACMAN="nodejs npm git curl wget gtk3 libnotify nss libxss libxtst xdg-utils libsecret libappindicator-gtk3"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==============================================================================
# FUNCTIONS
# ==============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}=======================================${NC}"
    echo -e "${CYAN}   $APP_NAME Installer v$VERSION${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ "$USER_INSTALL" == "false" && $EUID -ne 0 ]]; then
        print_error "Este script precisa ser executado como root (sudo)"
        print_status "Use --user para instalação local sem sudo"
        exit 1
    fi
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        DISTRO_VERSION=$VERSION_ID
        DISTRO_NAME=$NAME
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        DISTRO=$DISTRIB_ID
        DISTRO_VERSION=$DISTRIB_RELEASE
        DISTRO_NAME=$DISTRIB_DESCRIPTION
    else
        DISTRO="unknown"
        DISTRO_VERSION="unknown"
        DISTRO_NAME="Unknown Linux"
    fi
    
    print_status "Distribuição detectada: $DISTRO_NAME"
}

detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
        PKG_INSTALL="apt-get install -y"
        PKG_UPDATE="apt-get update"
        DEPS="$DEPS_APT"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_INSTALL="dnf install -y"
        PKG_UPDATE="dnf check-update || true"
        DEPS="$DEPS_DNF"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_INSTALL="yum install -y"
        PKG_UPDATE="yum check-update || true"
        DEPS="$DEPS_DNF"
    elif command -v pacman &> /dev/null; then
        PKG_MANAGER="pacman"
        PKG_INSTALL="pacman -S --noconfirm"
        PKG_UPDATE="pacman -Sy"
        DEPS="$DEPS_PACMAN"
    elif command -v zypper &> /dev/null; then
        PKG_MANAGER="zypper"
        PKG_INSTALL="zypper install -y"
        PKG_UPDATE="zypper refresh"
        DEPS="$DEPS_DNF"
    else
        PKG_MANAGER="unknown"
        print_warning "Gerenciador de pacotes não detectado"
    fi
    
    print_status "Gerenciador de pacotes: $PKG_MANAGER"
}

install_dependencies() {
    print_status "Instalando dependências do sistema..."
    
    if [[ "$PKG_MANAGER" == "unknown" ]]; then
        print_warning "Pulando instalação de dependências (gerenciador não suportado)"
        return 0
    fi
    
    if [[ "$USER_INSTALL" == "true" ]]; then
        print_warning "Instalação de usuário: dependências do sistema devem ser instaladas manualmente"
        return 0
    fi
    
    # Update package list
    print_status "Atualizando lista de pacotes..."
    $PKG_UPDATE
    
    # Install dependencies
    print_status "Instalando: $DEPS"
    $PKG_INSTALL $DEPS
    
    print_success "Dependências instaladas"
}

check_node_version() {
    print_status "Verificando Node.js..."
    
    if ! command -v node &> /dev/null; then
        print_warning "Node.js não encontrado"
        install_node
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
        
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js $NODE_VERSION encontrado, mas versão 18+ é recomendada"
            read -p "Deseja atualizar o Node.js? [Y/n] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
                install_node
            fi
        else
            print_success "Node.js v$NODE_VERSION instalado"
        fi
    fi
}

install_node() {
    print_status "Instalando Node.js 20 LTS..."
    
    # Use NodeSource for newer Node.js
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    elif [[ "$PKG_MANAGER" == "dnf" ]] || [[ "$PKG_MANAGER" == "yum" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PKG_INSTALL nodejs
    else
        # Use nvm for other distros
        print_status "Usando nvm para instalar Node.js..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
    fi
    
    print_success "Node.js instalado: $(node -v)"
}

setup_directories() {
    print_status "Criando diretórios de instalação..."
    
    if [[ "$USER_INSTALL" == "true" ]]; then
        PREFIX="$HOME/.local/share/$APP_ID"
        BIN_DIR="$HOME/.local/bin"
        DESKTOP_DIR="$HOME/.local/share/applications"
        ICON_DIR="$HOME/.local/share/icons/hicolor"
    fi
    
    mkdir -p "$PREFIX"
    mkdir -p "$BIN_DIR"
    mkdir -p "$DESKTOP_DIR"
    mkdir -p "$ICON_DIR/512x512/apps"
    mkdir -p "$ICON_DIR/256x256/apps"
    mkdir -p "$ICON_DIR/128x128/apps"
    mkdir -p "$ICON_DIR/64x64/apps"
    mkdir -p "$ICON_DIR/48x48/apps"
    mkdir -p "$ICON_DIR/32x32/apps"
    
    print_success "Diretórios criados"
}

install_app() {
    print_status "Instalando $APP_NAME..."
    
    # Copy application files
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    APP_SOURCE="${SCRIPT_DIR}/../.."
    
    if [ -d "$APP_SOURCE/dist" ]; then
        # Install from built distribution
        cp -r "$APP_SOURCE/dist/"* "$PREFIX/"
    elif [ -d "$APP_SOURCE/out" ]; then
        # Install from Electron build
        cp -r "$APP_SOURCE/out/linux-"*/* "$PREFIX/"
    else
        # Install from source
        cp -r "$APP_SOURCE/"* "$PREFIX/"
        
        # Install npm dependencies
        cd "$PREFIX"
        npm install --production
    fi
    
    # Make executable
    chmod +x "$PREFIX/$APP_ID" 2>/dev/null || true
    chmod +x "$PREFIX/aethel-engine" 2>/dev/null || true
    
    print_success "Arquivos instalados em $PREFIX"
}

create_launcher() {
    print_status "Criando launcher..."
    
    # Create launcher script
    cat > "$BIN_DIR/$APP_ID" << EOF
#!/bin/bash
# Aethel Engine Launcher
cd "$PREFIX"
exec ./aethel-engine "\$@"
EOF
    
    chmod +x "$BIN_DIR/$APP_ID"
    
    # Create symlinks
    ln -sf "$BIN_DIR/$APP_ID" "$BIN_DIR/aethel" 2>/dev/null || true
    
    print_success "Launcher criado: $BIN_DIR/$APP_ID"
}

create_desktop_entry() {
    print_status "Criando entrada no menu..."
    
    cat > "$DESKTOP_DIR/$APP_ID.desktop" << EOF
[Desktop Entry]
Name=Aethel Engine
GenericName=Game Engine
Comment=Professional Game Development IDE
Exec=$BIN_DIR/$APP_ID %F
Icon=$APP_ID
Type=Application
Categories=Development;IDE;Graphics;
Keywords=game;engine;3d;development;ide;
StartupNotify=true
StartupWMClass=aethel-engine
MimeType=application/x-aethel-project;
Actions=new-project;documentation;

[Desktop Action new-project]
Name=New Project
Exec=$BIN_DIR/$APP_ID --new-project

[Desktop Action documentation]
Name=Documentation
Exec=xdg-open https://aethel.dev/docs
EOF
    
    chmod +x "$DESKTOP_DIR/$APP_ID.desktop"
    
    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    fi
    
    print_success "Entrada de menu criada"
}

install_icons() {
    print_status "Instalando ícones..."
    
    ICON_SOURCE="$PREFIX/resources/icons"
    
    if [ -d "$ICON_SOURCE" ]; then
        for size in 512 256 128 64 48 32; do
            if [ -f "$ICON_SOURCE/${size}x${size}.png" ]; then
                cp "$ICON_SOURCE/${size}x${size}.png" "$ICON_DIR/${size}x${size}/apps/$APP_ID.png"
            fi
        done
    else
        # Create placeholder icon
        print_warning "Ícones não encontrados, usando placeholder"
    fi
    
    # Update icon cache
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t "$ICON_DIR" 2>/dev/null || true
    fi
    
    print_success "Ícones instalados"
}

register_mime_types() {
    print_status "Registrando tipos de arquivo..."
    
    MIME_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/mime"
    mkdir -p "$MIME_DIR/packages"
    
    cat > "$MIME_DIR/packages/$APP_ID.xml" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
    <mime-type type="application/x-aethel-project">
        <comment>Aethel Engine Project</comment>
        <icon name="$APP_ID"/>
        <glob pattern="*.aethel"/>
        <glob pattern="project-bible.json"/>
    </mime-type>
</mime-info>
EOF
    
    # Update MIME database
    if command -v update-mime-database &> /dev/null; then
        update-mime-database "$MIME_DIR" 2>/dev/null || true
    fi
    
    print_success "Tipos MIME registrados"
}

setup_user_directories() {
    print_status "Configurando diretórios do usuário..."
    
    AETHEL_HOME="${HOME}/.aethel"
    mkdir -p "$AETHEL_HOME/projects"
    mkdir -p "$AETHEL_HOME/cache"
    mkdir -p "$AETHEL_HOME/logs"
    
    # Create default config
    if [ ! -f "$AETHEL_HOME/config.json" ]; then
        cat > "$AETHEL_HOME/config.json" << EOF
{
    "version": "$VERSION",
    "projectsDir": "$AETHEL_HOME/projects",
    "cacheDir": "$AETHEL_HOME/cache",
    "theme": "dark",
    "language": "pt-BR",
    "autoUpdate": true,
    "telemetry": false
}
EOF
    fi
    
    print_success "Diretórios do usuário configurados"
}

verify_installation() {
    print_status "Verificando instalação..."
    
    ERRORS=0
    
    # Check executable
    if [ ! -x "$BIN_DIR/$APP_ID" ]; then
        print_error "Launcher não encontrado ou não executável"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check desktop entry
    if [ ! -f "$DESKTOP_DIR/$APP_ID.desktop" ]; then
        print_error "Entrada de menu não encontrada"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check installation directory
    if [ ! -d "$PREFIX" ]; then
        print_error "Diretório de instalação não encontrado"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ $ERRORS -eq 0 ]; then
        print_success "Instalação verificada com sucesso!"
        return 0
    else
        print_error "Instalação com $ERRORS erro(s)"
        return 1
    fi
}

print_completion() {
    echo ""
    echo -e "${GREEN}=======================================${NC}"
    echo -e "${GREEN}   Instalação Concluída!${NC}"
    echo -e "${GREEN}=======================================${NC}"
    echo ""
    echo -e "O $APP_NAME foi instalado com sucesso!"
    echo ""
    echo "Para iniciar:"
    echo -e "  ${CYAN}$APP_ID${NC}"
    echo "  ou"
    echo -e "  ${CYAN}aethel${NC}"
    echo ""
    echo "Ou procure por 'Aethel Engine' no menu de aplicativos."
    echo ""
    echo "Diretório de instalação: $PREFIX"
    echo "Projetos: $HOME/.aethel/projects"
    echo ""
    echo -e "Documentação: ${CYAN}https://aethel.dev/docs${NC}"
    echo ""
}

# ==============================================================================
# ARGUMENT PARSING
# ==============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --prefix=*)
            PREFIX="${1#*=}"
            shift
            ;;
        --user)
            USER_INSTALL=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opções]"
            echo ""
            echo "Opções:"
            echo "  --prefix=PATH    Diretório de instalação (padrão: /opt/aethel-engine)"
            echo "  --user           Instalação local (sem sudo)"
            echo "  --help, -h       Mostrar esta ajuda"
            echo ""
            exit 0
            ;;
        *)
            print_error "Opção desconhecida: $1"
            exit 1
            ;;
    esac
done

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    print_header
    
    # Pre-checks
    detect_distro
    detect_package_manager
    check_root
    
    # Installation steps
    install_dependencies
    check_node_version
    setup_directories
    install_app
    create_launcher
    create_desktop_entry
    install_icons
    register_mime_types
    setup_user_directories
    
    # Verification
    if verify_installation; then
        print_completion
        exit 0
    else
        print_error "Instalação falhou. Verifique os erros acima."
        exit 1
    fi
}

# Run
main
