#!/bin/bash
# ==============================================================================
# AETHEL ENGINE - Linux Smoke Test Script
# ==============================================================================
#
# Script para validar que o Aethel Engine funciona corretamente após instalação.
# Executa testes básicos de funcionalidade.
#
# Uso:
#   ./smoke-test.sh                  # Teste completo
#   ./smoke-test.sh --quick          # Teste rápido (sem servidor)
#   ./smoke-test.sh --ci             # Modo CI (sem GUI)
#

set -e

# ==============================================================================
# CONFIGURATION
# ==============================================================================

APP_ID="aethel-engine"
TIMEOUT_SECONDS=30
TEST_PORT=4000
TEMP_DIR="/tmp/aethel-smoke-test-$$"
LOG_FILE="$TEMP_DIR/smoke-test.log"

QUICK_MODE=false
CI_MODE=false
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# ==============================================================================
# FUNCTIONS
# ==============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}=======================================${NC}"
    echo -e "${CYAN}   Aethel Engine Smoke Test${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
}

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" >> "$LOG_FILE"
    if [[ "$VERBOSE" == "true" ]]; then
        echo "$msg"
    fi
}

test_pass() {
    local test_name=$1
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} $test_name"
    log "PASS: $test_name"
}

test_fail() {
    local test_name=$1
    local reason=${2:-"Unknown error"}
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} $test_name"
    echo -e "  ${RED}Razão: $reason${NC}"
    log "FAIL: $test_name - $reason"
}

test_skip() {
    local test_name=$1
    local reason=${2:-"Skipped"}
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    echo -e "${YELLOW}○${NC} $test_name (pulado: $reason)"
    log "SKIP: $test_name - $reason"
}

setup() {
    mkdir -p "$TEMP_DIR"
    touch "$LOG_FILE"
    log "Smoke test started"
    log "Mode: quick=$QUICK_MODE, ci=$CI_MODE"
}

cleanup() {
    log "Cleaning up..."
    
    # Kill any spawned processes
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    # Remove temp directory
    rm -rf "$TEMP_DIR"
    
    log "Smoke test finished"
}

trap cleanup EXIT

# ==============================================================================
# TEST CASES
# ==============================================================================

test_binary_exists() {
    local test_name="Binário existe"
    
    if command -v "$APP_ID" &> /dev/null; then
        test_pass "$test_name"
        return 0
    elif [ -f "/opt/aethel-engine/aethel-engine" ]; then
        test_pass "$test_name (path alternativo)"
        return 0
    elif [ -f "$HOME/.local/share/$APP_ID/aethel-engine" ]; then
        test_pass "$test_name (instalação de usuário)"
        return 0
    else
        test_fail "$test_name" "Binário não encontrado em PATH, /opt ou ~/.local"
        return 1
    fi
}

test_desktop_entry() {
    local test_name="Entrada de desktop"
    
    local desktop_file=""
    if [ -f "/usr/share/applications/$APP_ID.desktop" ]; then
        desktop_file="/usr/share/applications/$APP_ID.desktop"
    elif [ -f "$HOME/.local/share/applications/$APP_ID.desktop" ]; then
        desktop_file="$HOME/.local/share/applications/$APP_ID.desktop"
    fi
    
    if [ -z "$desktop_file" ]; then
        test_fail "$test_name" "Arquivo .desktop não encontrado"
        return 1
    fi
    
    # Validate desktop file
    if command -v desktop-file-validate &> /dev/null; then
        if desktop-file-validate "$desktop_file" 2>/dev/null; then
            test_pass "$test_name"
            return 0
        else
            test_fail "$test_name" "Arquivo .desktop inválido"
            return 1
        fi
    fi
    
    test_pass "$test_name"
    return 0
}

test_node_version() {
    local test_name="Node.js versão >= 18"
    
    if ! command -v node &> /dev/null; then
        test_fail "$test_name" "Node.js não encontrado"
        return 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2)
    local node_major=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$node_major" -ge 18 ]; then
        test_pass "$test_name (v$node_version)"
        return 0
    else
        test_fail "$test_name" "Versão $node_version < 18"
        return 1
    fi
}

test_npm_available() {
    local test_name="npm disponível"
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        test_pass "$test_name (v$npm_version)"
        return 0
    else
        test_fail "$test_name" "npm não encontrado"
        return 1
    fi
}

test_required_libs() {
    local test_name="Bibliotecas GTK/WebKit"
    
    # Check for required shared libraries
    local missing=""
    
    # Check libgtk-3
    if ! ldconfig -p 2>/dev/null | grep -q "libgtk-3"; then
        missing="$missing libgtk-3"
    fi
    
    # Check libnotify
    if ! ldconfig -p 2>/dev/null | grep -q "libnotify"; then
        missing="$missing libnotify"
    fi
    
    # Check libnss
    if ! ldconfig -p 2>/dev/null | grep -q "libnss3"; then
        missing="$missing libnss3"
    fi
    
    if [ -z "$missing" ]; then
        test_pass "$test_name"
        return 0
    else
        test_fail "$test_name" "Faltando:$missing"
        return 1
    fi
}

test_user_directories() {
    local test_name="Diretórios do usuário"
    
    local aethel_home="$HOME/.aethel"
    
    if [ -d "$aethel_home" ]; then
        if [ -d "$aethel_home/projects" ] && [ -d "$aethel_home/cache" ]; then
            test_pass "$test_name"
            return 0
        else
            test_fail "$test_name" "Subdiretórios não criados"
            return 1
        fi
    else
        test_skip "$test_name" "~/.aethel não existe (primeira execução)"
        return 0
    fi
}

test_config_file() {
    local test_name="Arquivo de configuração"
    
    local config_file="$HOME/.aethel/config.json"
    
    if [ -f "$config_file" ]; then
        # Validate JSON
        if command -v jq &> /dev/null; then
            if jq empty "$config_file" 2>/dev/null; then
                test_pass "$test_name"
                return 0
            else
                test_fail "$test_name" "JSON inválido"
                return 1
            fi
        elif command -v python3 &> /dev/null; then
            if python3 -c "import json; json.load(open('$config_file'))" 2>/dev/null; then
                test_pass "$test_name"
                return 0
            else
                test_fail "$test_name" "JSON inválido"
                return 1
            fi
        fi
        
        test_pass "$test_name"
        return 0
    else
        test_skip "$test_name" "Arquivo não existe (primeira execução)"
        return 0
    fi
}

test_port_available() {
    local test_name="Porta $TEST_PORT disponível"
    
    if command -v lsof &> /dev/null; then
        if lsof -i :$TEST_PORT &>/dev/null; then
            test_fail "$test_name" "Porta em uso"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$TEST_PORT "; then
            test_fail "$test_name" "Porta em uso"
            return 1
        fi
    fi
    
    test_pass "$test_name"
    return 0
}

test_server_startup() {
    local test_name="Servidor inicia"
    
    if [[ "$QUICK_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo rápido"
        return 0
    fi
    
    # Find the server entry point
    local server_cmd=""
    
    if [ -f "/opt/aethel-engine/server.js" ]; then
        server_cmd="node /opt/aethel-engine/server.js"
    elif [ -f "$HOME/.local/share/$APP_ID/server.js" ]; then
        server_cmd="node $HOME/.local/share/$APP_ID/server.js"
    else
        test_skip "$test_name" "server.js não encontrado"
        return 0
    fi
    
    # Start server in background
    log "Starting server: $server_cmd"
    $server_cmd &> "$TEMP_DIR/server.log" &
    SERVER_PID=$!
    
    # Wait for server to start
    local waited=0
    while [ $waited -lt $TIMEOUT_SECONDS ]; do
        if curl -s "http://localhost:$TEST_PORT/api/health" &>/dev/null; then
            test_pass "$test_name"
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    test_fail "$test_name" "Timeout após $TIMEOUT_SECONDS segundos"
    return 1
}

test_health_endpoint() {
    local test_name="Endpoint /api/health"
    
    if [[ "$QUICK_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo rápido"
        return 0
    fi
    
    if [ -z "$SERVER_PID" ]; then
        test_skip "$test_name" "Servidor não iniciado"
        return 0
    fi
    
    local response=$(curl -s -w "%{http_code}" -o "$TEMP_DIR/health.json" "http://localhost:$TEST_PORT/api/health")
    
    if [ "$response" == "200" ]; then
        # Validate response
        if command -v jq &> /dev/null; then
            local status=$(jq -r '.status' "$TEMP_DIR/health.json" 2>/dev/null)
            if [ "$status" == "healthy" ] || [ "$status" == "ok" ]; then
                test_pass "$test_name"
                return 0
            fi
        fi
        test_pass "$test_name"
        return 0
    else
        test_fail "$test_name" "HTTP $response"
        return 1
    fi
}

test_static_files() {
    local test_name="Arquivos estáticos"
    
    if [[ "$QUICK_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo rápido"
        return 0
    fi
    
    if [ -z "$SERVER_PID" ]; then
        test_skip "$test_name" "Servidor não iniciado"
        return 0
    fi
    
    # Test root page
    local response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$TEST_PORT/")
    
    if [ "$response" == "200" ]; then
        test_pass "$test_name"
        return 0
    else
        test_fail "$test_name" "HTTP $response"
        return 1
    fi
}

test_electron_executable() {
    local test_name="Electron executável"
    
    if [[ "$CI_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo CI (sem GUI)"
        return 0
    fi
    
    # Find Electron binary
    local electron_bin=""
    
    if [ -f "/opt/aethel-engine/aethel-engine" ]; then
        electron_bin="/opt/aethel-engine/aethel-engine"
    elif [ -f "$HOME/.local/share/$APP_ID/aethel-engine" ]; then
        electron_bin="$HOME/.local/share/$APP_ID/aethel-engine"
    fi
    
    if [ -z "$electron_bin" ]; then
        test_skip "$test_name" "Binário não encontrado"
        return 0
    fi
    
    # Check if executable
    if [ -x "$electron_bin" ]; then
        test_pass "$test_name"
        return 0
    else
        test_fail "$test_name" "Não executável"
        return 1
    fi
}

test_display_available() {
    local test_name="Display disponível"
    
    if [[ "$CI_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo CI"
        return 0
    fi
    
    if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
        test_fail "$test_name" "Nenhum display encontrado"
        return 1
    fi
    
    if [ ! -z "$DISPLAY" ]; then
        test_pass "$test_name (X11: $DISPLAY)"
    elif [ ! -z "$WAYLAND_DISPLAY" ]; then
        test_pass "$test_name (Wayland: $WAYLAND_DISPLAY)"
    fi
    
    return 0
}

test_gpu_acceleration() {
    local test_name="Aceleração GPU"
    
    if [[ "$CI_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo CI"
        return 0
    fi
    
    # Check for GPU drivers
    if command -v glxinfo &> /dev/null; then
        if glxinfo 2>/dev/null | grep -qi "direct rendering: yes"; then
            local renderer=$(glxinfo 2>/dev/null | grep "OpenGL renderer" | cut -d':' -f2 | xargs)
            test_pass "$test_name ($renderer)"
            return 0
        else
            test_fail "$test_name" "Direct rendering não disponível"
            return 1
        fi
    fi
    
    # Check for DRI
    if [ -d "/dev/dri" ]; then
        test_pass "$test_name (DRI presente)"
        return 0
    fi
    
    test_skip "$test_name" "Não foi possível verificar"
    return 0
}

test_memory_available() {
    local test_name="Memória disponível >= 4GB"
    
    local mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local mem_gb=$((mem_kb / 1024 / 1024))
    
    if [ "$mem_gb" -ge 4 ]; then
        test_pass "$test_name (${mem_gb}GB)"
        return 0
    else
        test_fail "$test_name" "Apenas ${mem_gb}GB disponível"
        return 1
    fi
}

test_disk_space() {
    local test_name="Espaço em disco >= 2GB"
    
    local install_dir="/opt/aethel-engine"
    if [ ! -d "$install_dir" ]; then
        install_dir="$HOME"
    fi
    
    local available_kb=$(df -k "$install_dir" | tail -1 | awk '{print $4}')
    local available_gb=$((available_kb / 1024 / 1024))
    
    if [ "$available_gb" -ge 2 ]; then
        test_pass "$test_name (${available_gb}GB livres)"
        return 0
    else
        test_fail "$test_name" "Apenas ${available_gb}GB disponível"
        return 1
    fi
}

test_create_project() {
    local test_name="Criar projeto de teste"
    
    if [[ "$QUICK_MODE" == "true" ]]; then
        test_skip "$test_name" "Modo rápido"
        return 0
    fi
    
    local test_project="$TEMP_DIR/test-project"
    mkdir -p "$test_project"
    
    # Create minimal project structure
    cat > "$test_project/project-bible.json" << EOF
{
    "name": "smoke-test-project",
    "version": "1.0.0",
    "engine": "aethel",
    "created": "$(date -Iseconds)"
}
EOF
    
    mkdir -p "$test_project/assets"
    mkdir -p "$test_project/scenes"
    mkdir -p "$test_project/scripts"
    
    if [ -f "$test_project/project-bible.json" ]; then
        test_pass "$test_name"
        return 0
    else
        test_fail "$test_name" "Falha ao criar arquivos"
        return 1
    fi
}

# ==============================================================================
# MAIN
# ==============================================================================

print_results() {
    echo ""
    echo -e "${CYAN}=======================================${NC}"
    echo -e "${CYAN}   Resultados${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
    echo -e "  ${GREEN}Passou:${NC}  $TESTS_PASSED"
    echo -e "  ${RED}Falhou:${NC}  $TESTS_FAILED"
    echo -e "  ${YELLOW}Pulado:${NC}  $TESTS_SKIPPED"
    echo ""
    
    local total=$((TESTS_PASSED + TESTS_FAILED))
    if [ $total -gt 0 ]; then
        local percent=$((TESTS_PASSED * 100 / total))
        echo -e "  Taxa de sucesso: ${percent}%"
    fi
    
    echo ""
    echo "Log: $LOG_FILE"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opções]"
            echo ""
            echo "Opções:"
            echo "  --quick     Teste rápido (sem servidor)"
            echo "  --ci        Modo CI (sem GUI)"
            echo "  --verbose   Saída detalhada"
            echo "  --help      Mostrar ajuda"
            echo ""
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            exit 1
            ;;
    esac
done

main() {
    print_header
    setup
    
    echo -e "${BLUE}[1/4] Testes de Instalação${NC}"
    echo "────────────────────────────"
    test_binary_exists
    test_desktop_entry
    test_user_directories
    test_config_file
    echo ""
    
    echo -e "${BLUE}[2/4] Testes de Dependências${NC}"
    echo "────────────────────────────"
    test_node_version
    test_npm_available
    test_required_libs
    echo ""
    
    echo -e "${BLUE}[3/4] Testes de Sistema${NC}"
    echo "────────────────────────────"
    test_memory_available
    test_disk_space
    test_display_available
    test_gpu_acceleration
    test_port_available
    echo ""
    
    echo -e "${BLUE}[4/4] Testes de Funcionalidade${NC}"
    echo "────────────────────────────"
    test_electron_executable
    test_server_startup
    test_health_endpoint
    test_static_files
    test_create_project
    echo ""
    
    print_results
    
    # Exit with error if any tests failed
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    fi
    
    exit 0
}

main
