#!/bin/bash
# ============================================================================
# Aethel Engine - Instalador Automático de Dependências (Unix/MacOS)
# ============================================================================
#
# Script Bash que detecta e instala todas as dependências necessárias
# para rodar o Aethel Engine sem intervenção manual do usuário.
#
# Versão: 1.0.0
# Autor: Aethel Engine Team
# Data: 2026-01-08
# ============================================================================

set -e

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

REQUIRED_NODE_VERSION=18
AETHEL_DATA_DIR="$HOME/.aethel"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Funções de output
status() { echo -e "${CYAN}[*]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# ============================================================================
# BANNER
# ============================================================================

show_banner() {
    echo -e "${MAGENTA}"
    cat << 'EOF'

    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     █████╗ ███████╗████████╗██╗  ██╗███████╗██╗              ║
    ║    ██╔══██╗██╔════╝╚══██╔══╝██║  ██║██╔════╝██║              ║
    ║    ███████║█████╗     ██║   ███████║█████╗  ██║              ║
    ║    ██╔══██║██╔══╝     ██║   ██╔══██║██╔══╝  ██║              ║
    ║    ██║  ██║███████╗   ██║   ██║  ██║███████╗███████╗         ║
    ║    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝         ║
    ║                                                               ║
    ║           E N G I N E   S E T U P   W I Z A R D              ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"
}

# ============================================================================
# DETECÇÃO DE SISTEMA
# ============================================================================

detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        CYGWIN*)    echo "windows";;
        MINGW*)     echo "windows";;
        *)          echo "unknown";;
    esac
}

detect_arch() {
    case "$(uname -m)" in
        x86_64)     echo "x64";;
        arm64)      echo "arm64";;
        aarch64)    echo "arm64";;
        *)          echo "unknown";;
    esac
}

detect_package_manager() {
    local os=$(detect_os)
    
    if [ "$os" = "macos" ]; then
        if command -v brew &> /dev/null; then
            echo "brew"
            return
        fi
    elif [ "$os" = "linux" ]; then
        if command -v apt-get &> /dev/null; then
            echo "apt"
            return
        elif command -v dnf &> /dev/null; then
            echo "dnf"
            return
        elif command -v pacman &> /dev/null; then
            echo "pacman"
            return
        elif command -v zypper &> /dev/null; then
            echo "zypper"
            return
        fi
    fi
    
    echo "none"
}

# ============================================================================
# INSTALAÇÃO DE PACKAGE MANAGER
# ============================================================================

install_homebrew() {
    status "Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Adicionar ao PATH para Apple Silicon
    if [ "$(detect_arch)" = "arm64" ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    success "Homebrew instalado!"
}

# ============================================================================
# VERIFICAÇÃO DE DEPENDÊNCIAS
# ============================================================================

check_nodejs() {
    if command -v node &> /dev/null; then
        local version=$(node --version | tr -d 'v' | cut -d'.' -f1)
        local full_version=$(node --version)
        if [ "$version" -ge "$REQUIRED_NODE_VERSION" ]; then
            echo "installed:$full_version:ok"
        else
            echo "installed:$full_version:outdated"
        fi
    else
        echo "missing:none:missing"
    fi
}

check_blender() {
    local blender_paths=(
        "/Applications/Blender.app/Contents/MacOS/Blender"
        "/Applications/Blender 4.2.app/Contents/MacOS/Blender"
        "/Applications/Blender 4.1.app/Contents/MacOS/Blender"
        "/Applications/Blender 4.0.app/Contents/MacOS/Blender"
        "/usr/bin/blender"
        "/usr/local/bin/blender"
        "/snap/bin/blender"
        "$HOME/Applications/Blender.app/Contents/MacOS/Blender"
    )
    
    for path in "${blender_paths[@]}"; do
        if [ -x "$path" ]; then
            local version=$("$path" --version 2>/dev/null | head -1 || echo "Unknown")
            echo "installed:$version:$path"
            return
        fi
    done
    
    if command -v blender &> /dev/null; then
        local version=$(blender --version 2>/dev/null | head -1 || echo "Unknown")
        local path=$(which blender)
        echo "installed:$version:$path"
        return
    fi
    
    echo "missing:none:none"
}

check_ffmpeg() {
    if command -v ffmpeg &> /dev/null; then
        local version=$(ffmpeg -version 2>/dev/null | head -1 || echo "Unknown")
        echo "installed:$version"
    else
        echo "missing:none"
    fi
}

check_ollama() {
    if command -v ollama &> /dev/null; then
        local version=$(ollama --version 2>/dev/null || echo "Unknown")
        echo "installed:$version"
    else
        echo "missing:none"
    fi
}

check_git() {
    if command -v git &> /dev/null; then
        local version=$(git --version)
        echo "installed:$version"
    else
        echo "missing:none"
    fi
}

# ============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================================================

install_dependency() {
    local name=$1
    local pm=$(detect_package_manager)
    
    status "Instalando $name..."
    
    case "$pm" in
        "brew")
            case "$name" in
                "nodejs") brew install node;;
                "blender") brew install --cask blender;;
                "ffmpeg") brew install ffmpeg;;
                "ollama") brew install ollama;;
                "git") brew install git;;
            esac
            ;;
        "apt")
            case "$name" in
                "nodejs")
                    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    ;;
                "blender") sudo apt-get install -y blender;;
                "ffmpeg") sudo apt-get install -y ffmpeg;;
                "ollama") curl -fsSL https://ollama.ai/install.sh | sh;;
                "git") sudo apt-get install -y git;;
            esac
            ;;
        "dnf")
            case "$name" in
                "nodejs") sudo dnf install -y nodejs;;
                "blender") sudo dnf install -y blender;;
                "ffmpeg") sudo dnf install -y ffmpeg;;
                "ollama") curl -fsSL https://ollama.ai/install.sh | sh;;
                "git") sudo dnf install -y git;;
            esac
            ;;
        "pacman")
            case "$name" in
                "nodejs") sudo pacman -S --noconfirm nodejs npm;;
                "blender") sudo pacman -S --noconfirm blender;;
                "ffmpeg") sudo pacman -S --noconfirm ffmpeg;;
                "ollama") curl -fsSL https://ollama.ai/install.sh | sh;;
                "git") sudo pacman -S --noconfirm git;;
            esac
            ;;
        *)
            error "Gerenciador de pacotes não suportado"
            return 1
            ;;
    esac
    
    success "$name instalado com sucesso!"
}

# ============================================================================
# CONFIGURAÇÃO DO AMBIENTE
# ============================================================================

initialize_environment() {
    status "Configurando ambiente Aethel..."
    
    # Criar diretório de dados
    mkdir -p "$AETHEL_DATA_DIR"/{cache,logs,projects,assets,config}
    
    # Criar arquivo de configuração inicial
    local config_file="$AETHEL_DATA_DIR/config/settings.json"
    if [ ! -f "$config_file" ]; then
        cat > "$config_file" << EOF
{
    "version": "1.0.0",
    "installedAt": "$(date -Iseconds)",
    "paths": {
        "blender": null,
        "ffmpeg": null,
        "ollama": null
    },
    "preferences": {
        "theme": "dark",
        "autoUpdate": true,
        "telemetry": false
    }
}
EOF
        success "Configuração inicial criada"
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    show_banner
    
    local os=$(detect_os)
    local arch=$(detect_arch)
    
    status "Sistema detectado: $os ($arch)"
    echo ""
    
    # Verificar dependências
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    VERIFICAÇÃO DE DEPENDÊNCIAS                "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Node.js
    local node_result=$(check_nodejs)
    local node_status=$(echo "$node_result" | cut -d':' -f1)
    local node_version=$(echo "$node_result" | cut -d':' -f2)
    local node_ok=$(echo "$node_result" | cut -d':' -f3)
    
    if [ "$node_status" = "installed" ]; then
        if [ "$node_ok" = "ok" ]; then
            success "Node.js: v$node_version (OK)"
        else
            warning "Node.js: v$node_version (Requer v$REQUIRED_NODE_VERSION+)"
        fi
    else
        error "Node.js: NÃO INSTALADO"
    fi
    
    # Blender
    local blender_result=$(check_blender)
    local blender_status=$(echo "$blender_result" | cut -d':' -f1)
    local blender_version=$(echo "$blender_result" | cut -d':' -f2)
    local blender_path=$(echo "$blender_result" | cut -d':' -f3)
    
    if [ "$blender_status" = "installed" ]; then
        success "Blender: $blender_version"
        echo "         Path: $blender_path"
    else
        error "Blender: NÃO INSTALADO"
    fi
    
    # FFmpeg
    local ffmpeg_result=$(check_ffmpeg)
    local ffmpeg_status=$(echo "$ffmpeg_result" | cut -d':' -f1)
    
    if [ "$ffmpeg_status" = "installed" ]; then
        success "FFmpeg: Instalado"
    else
        warning "FFmpeg: NÃO INSTALADO (Opcional)"
    fi
    
    # Ollama
    local ollama_result=$(check_ollama)
    local ollama_status=$(echo "$ollama_result" | cut -d':' -f1)
    
    if [ "$ollama_status" = "installed" ]; then
        success "Ollama: Instalado"
    else
        warning "Ollama: NÃO INSTALADO (Opcional - IA local)"
    fi
    
    # Git
    local git_result=$(check_git)
    local git_status=$(echo "$git_result" | cut -d':' -f1)
    
    if [ "$git_status" = "installed" ]; then
        success "Git: Instalado"
    else
        warning "Git: NÃO INSTALADO (Opcional)"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # Verificar package manager
    local pm=$(detect_package_manager)
    if [ "$pm" = "none" ]; then
        if [ "$os" = "macos" ]; then
            echo ""
            read -p "Homebrew não encontrado. Deseja instalar? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_homebrew
                pm="brew"
            fi
        fi
    fi
    
    # Perguntar se quer instalar dependências faltantes
    local needs_install=()
    
    if [ "$node_status" = "missing" ] || [ "$node_ok" = "outdated" ]; then
        needs_install+=("nodejs")
    fi
    if [ "$blender_status" = "missing" ]; then
        needs_install+=("blender")
    fi
    
    if [ ${#needs_install[@]} -gt 0 ] && [ "$pm" != "none" ]; then
        echo ""
        status "Dependências faltantes: ${needs_install[*]}"
        read -p "Deseja instalar automaticamente? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for dep in "${needs_install[@]}"; do
                install_dependency "$dep"
            done
        fi
    fi
    
    # Configurar ambiente
    echo ""
    initialize_environment
    
    # Resumo final
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                         RESUMO FINAL                          "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Re-verificar
    node_result=$(check_nodejs)
    node_status=$(echo "$node_result" | cut -d':' -f1)
    node_ok=$(echo "$node_result" | cut -d':' -f3)
    
    blender_result=$(check_blender)
    blender_status=$(echo "$blender_result" | cut -d':' -f1)
    
    if [ "$node_status" = "installed" ] && [ "$node_ok" = "ok" ] && [ "$blender_status" = "installed" ]; then
        success "✅ Ambiente pronto para Aethel Engine!"
        echo ""
        echo "   Próximos passos:"
        echo "   1. cd meu-repo"
        echo "   2. npm install"
        echo "   3. npm start"
        exit 0
    else
        warning "⚠️  Algumas dependências estão faltando."
        echo ""
        echo "   Para instalar manualmente:"
        if [ "$node_status" = "missing" ]; then
            echo "   • Node.js: https://nodejs.org/"
        fi
        if [ "$blender_status" = "missing" ]; then
            echo "   • Blender: https://www.blender.org/download/"
        fi
        exit 1
    fi
}

# Executar
main "$@"
