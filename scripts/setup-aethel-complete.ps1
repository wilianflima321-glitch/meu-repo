<# 
.SYNOPSIS
    Complete setup script for Aethel Engine Development Environment

.DESCRIPTION
    This script sets up all dependencies, databases, and services required
    to run the Aethel Engine IDE and game engine.

.EXAMPLE
    .\setup-aethel-complete.ps1 -All
    .\setup-aethel-complete.ps1 -Dependencies
    .\setup-aethel-complete.ps1 -Database
    .\setup-aethel-complete.ps1 -Start
#>

param(
    [switch]$All,
    [switch]$Dependencies,
    [switch]$Database,
    [switch]$Start,
    [switch]$Check,
    [switch]$Help
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WebAppPath = Join-Path $ProjectRoot "cloud-web-app/web"

# Colors for output
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Fail { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Header { Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Blue; Write-Host "  $args" -ForegroundColor Blue; Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Blue }

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

Write-Header "AETHEL ENGINE - Complete Setup"

# ==============================================================================
# DEPENDENCY CHECK
# ==============================================================================

function Test-Dependency {
    param([string]$Command, [string]$Name)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        Write-Success "$Name encontrado"
        return $true
    } catch {
        Write-Fail "$Name NÃO encontrado"
        return $false
    }
}

function Test-AllDependencies {
    Write-Header "Verificando Dependências"
    
    $allOk = $true
    
    # Core
    $allOk = (Test-Dependency "node" "Node.js") -and $allOk
    $allOk = (Test-Dependency "npm" "NPM") -and $allOk
    $allOk = (Test-Dependency "git" "Git") -and $allOk
    
    # Package managers
    Test-Dependency "pnpm" "PNPM" | Out-Null
    Test-Dependency "yarn" "Yarn" | Out-Null
    
    # Database
    $allOk = (Test-Dependency "docker" "Docker") -and $allOk
    
    # LSP servers (optional)
    Write-Info "LSP Servers (opcional para recursos avançados):"
    Test-Dependency "typescript-language-server" "TypeScript LSP" | Out-Null
    Test-Dependency "pyright-langserver" "Python LSP (Pyright)" | Out-Null
    Test-Dependency "gopls" "Go LSP" | Out-Null
    Test-Dependency "rust-analyzer" "Rust LSP" | Out-Null
    
    return $allOk
}

# ==============================================================================
# INSTALL DEPENDENCIES
# ==============================================================================

function Install-Dependencies {
    Write-Header "Instalando Dependências"
    
    # Root package.json
    if (Test-Path (Join-Path $ProjectRoot "package.json")) {
        Write-Info "Instalando dependências do projeto raiz..."
        Push-Location $ProjectRoot
        npm install
        Pop-Location
    }
    
    # Web app
    if (Test-Path (Join-Path $WebAppPath "package.json")) {
        Write-Info "Instalando dependências do web app..."
        Push-Location $WebAppPath
        npm install
        
        # Install optional collaboration dependencies
        Write-Info "Instalando dependências de colaboração..."
        npm install y-monaco --save 2>$null
        if ($?) {
            Write-Success "y-monaco instalado"
        } else {
            Write-Warn "y-monaco falhou - colaboração usará fallback"
        }
        
        Pop-Location
    }
    
    # Global LSP servers
    Write-Info "Instalando LSP servers globalmente..."
    npm install -g typescript-language-server typescript 2>$null
    npm install -g @vscode/vscode-languageserver 2>$null
    
    Write-Success "Dependências instaladas"
}

# ==============================================================================
# DATABASE SETUP
# ==============================================================================

function Setup-Database {
    Write-Header "Configurando Banco de Dados"
    
    # Check if docker is running
    $dockerRunning = docker info 2>$null
    if (-not $?) {
        Write-Fail "Docker não está rodando. Inicie o Docker Desktop."
        return $false
    }
    
    # Start containers
    if (Test-Path (Join-Path $ProjectRoot "docker-compose.yml")) {
        Write-Info "Iniciando containers Docker..."
        Push-Location $ProjectRoot
        docker-compose up -d postgres redis
        Pop-Location
        
        # Wait for postgres
        Write-Info "Aguardando PostgreSQL iniciar..."
        Start-Sleep -Seconds 5
    }
    
    # Run Prisma migrations
    if (Test-Path (Join-Path $WebAppPath "prisma")) {
        Write-Info "Gerando cliente Prisma..."
        Push-Location $WebAppPath
        npx prisma generate
        
        Write-Info "Executando migrações do Prisma..."
        npx prisma migrate dev --name init 2>$null
        if (-not $?) {
            npx prisma db push
        }
        
        Write-Info "Populando dados iniciais..."
        npx prisma db seed 2>$null
        
        Pop-Location
    }
    
    Write-Success "Banco de dados configurado"
    return $true
}

# ==============================================================================
# ENVIRONMENT FILES
# ==============================================================================

function Setup-Environment {
    Write-Header "Configurando Variáveis de Ambiente"
    
    $envExample = Join-Path $WebAppPath ".env.example"
    $envFile = Join-Path $WebAppPath ".env"
    $envLocalFile = Join-Path $WebAppPath ".env.local"
    
    # Create .env if not exists
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Copy-Item $envExample $envFile
            Write-Info "Arquivo .env criado a partir do .env.example"
        } else {
            # Create minimal .env
            $envContent = @"
# Aethel Engine Environment Configuration
# Generated by setup script on $(Get-Date)

# Database
DATABASE_URL="postgresql://aethel:aethel123@localhost:5432/aethel_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(New-Guid)"

# AI Providers (configure at least one)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_AI_API_KEY=""
DEEPSEEK_API_KEY=""

# Filesystem Mode (true = real filesystem, false = Prisma DB)
USE_REAL_FILESYSTEM="true"
WORKSPACE_ROOT="$($ProjectRoot -replace '\\', '/')"

# WebSocket
WEBSOCKET_URL="ws://localhost:3001"

# Collaboration Server
COLLABORATION_WS_URL="ws://localhost:3001/collaboration"

# Development
NODE_ENV="development"
"@
            Set-Content $envFile $envContent
            Write-Info "Arquivo .env criado com configurações padrão"
        }
    } else {
        Write-Success ".env já existe"
    }
    
    # Check for required variables
    $envContent = Get-Content $envFile -Raw
    $missingVars = @()
    
    if ($envContent -notmatch 'DATABASE_URL=".+"') { $missingVars += "DATABASE_URL" }
    if ($envContent -notmatch 'NEXTAUTH_SECRET=".+"') { $missingVars += "NEXTAUTH_SECRET" }
    
    if ($missingVars.Count -gt 0) {
        Write-Warn "Variáveis obrigatórias faltando: $($missingVars -join ', ')"
    } else {
        Write-Success "Variáveis de ambiente configuradas"
    }
}

# ==============================================================================
# START SERVICES
# ==============================================================================

function Start-Services {
    Write-Header "Iniciando Serviços"
    
    # Start Docker containers
    if (Test-Path (Join-Path $ProjectRoot "docker-compose.yml")) {
        Write-Info "Iniciando containers Docker..."
        Push-Location $ProjectRoot
        docker-compose up -d
        Pop-Location
    }
    
    # Start web app
    Write-Info "Iniciando aplicação web..."
    Push-Location $WebAppPath
    
    # Start in new terminal
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebAppPath'; npm run dev"
    
    Pop-Location
    
    Write-Success "Serviços iniciados"
    Write-Info "Web App: http://localhost:3000"
    Write-Info "WebSocket: ws://localhost:3001"
}

# ==============================================================================
# HEALTH CHECK
# ==============================================================================

function Test-Health {
    Write-Header "Verificação de Saúde do Sistema"
    
    # Check services
    $services = @(
        @{Name="Web App"; URL="http://localhost:3000"; Expected=200},
        @{Name="API Health"; URL="http://localhost:3000/api/health"; Expected=200}
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.URL -Method GET -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq $service.Expected) {
                Write-Success "$($service.Name) está funcionando"
            } else {
                Write-Warn "$($service.Name) retornou status $($response.StatusCode)"
            }
        } catch {
            Write-Fail "$($service.Name) não está respondendo"
        }
    }
    
    # Check Docker containers
    Write-Info "Containers Docker:"
    docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

if ($All -or (-not ($Dependencies -or $Database -or $Start -or $Check))) {
    Test-AllDependencies
    Install-Dependencies
    Setup-Environment
    Setup-Database
    Write-Success "`nSetup completo! Use -Start para iniciar os serviços."
}

if ($Dependencies) {
    Test-AllDependencies
    Install-Dependencies
}

if ($Database) {
    Setup-Environment
    Setup-Database
}

if ($Start) {
    Start-Services
}

if ($Check) {
    Test-AllDependencies
    Test-Health
}

Write-Host "`n"
Write-Header "PRÓXIMOS PASSOS"
Write-Host @"
1. Configure suas API keys no arquivo .env:
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY
   - GOOGLE_AI_API_KEY (opcional)
   - DEEPSEEK_API_KEY (opcional)

2. Inicie os serviços:
   .\setup-aethel-complete.ps1 -Start

3. Acesse o IDE:
   http://localhost:3000

4. Para verificar a saúde do sistema:
   .\setup-aethel-complete.ps1 -Check

"@
