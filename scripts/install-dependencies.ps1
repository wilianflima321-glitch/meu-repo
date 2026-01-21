<# 
.SYNOPSIS
    Aethel Engine - Instalador Automático de Dependências
    
.DESCRIPTION
    Script PowerShell que detecta e instala todas as dependências necessárias
    para rodar o Aethel Engine sem intervenção manual do usuário.
    
.NOTES
    Versão: 1.0.0
    Autor: Aethel Engine Team
    Data: 2026-01-08
#>

param(
    [switch]$Force,
    [switch]$SkipNode,
    [switch]$SkipBlender,
    [switch]$SkipFFmpeg,
    [switch]$SkipOllama,
    [switch]$Silent
)

# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$REQUIRED_NODE_VERSION = 18
$REQUIRED_BLENDER_VERSION = "4.0"
$AETHEL_DATA_DIR = "$env:USERPROFILE\.aethel"

# Cores para output
function Write-Status { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[✗] $msg" -ForegroundColor Red }

# ============================================================================
# BANNER
# ============================================================================

function Show-Banner {
    Write-Host @"

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

"@ -ForegroundColor Magenta
}

# ============================================================================
# DETECÇÃO DE PACOTE MANAGER
# ============================================================================

function Get-PackageManager {
    # Verifica winget (Windows 11+ / Windows 10 com App Installer)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        return "winget"
    }
    
    # Verifica Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        return "choco"
    }
    
    # Verifica Scoop
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        return "scoop"
    }
    
    return $null
}

function Install-PackageManager {
    Write-Status "Nenhum gerenciador de pacotes encontrado. Instalando winget..."
    
    # Winget vem com App Installer da Microsoft Store
    # Tentamos instalar via PowerShell
    try {
        $progressPreference = 'silentlyContinue'
        Write-Status "Baixando App Installer (winget)..."
        
        # Para Windows 10, winget pode ser instalado via GitHub
        $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/winget-cli/releases/latest"
        $msixBundle = $releases.assets | Where-Object { $_.name -match "msixbundle" } | Select-Object -First 1
        
        if ($msixBundle) {
            $downloadPath = "$env:TEMP\Microsoft.DesktopAppInstaller.msixbundle"
            Invoke-WebRequest -Uri $msixBundle.browser_download_url -OutFile $downloadPath
            Add-AppxPackage -Path $downloadPath
            Write-Success "Winget instalado com sucesso!"
            return "winget"
        }
    } catch {
        Write-Warning "Não foi possível instalar winget automaticamente."
        Write-Warning "Por favor, instale manualmente: https://aka.ms/getwinget"
    }
    
    # Fallback: Instalar Chocolatey
    Write-Status "Tentando instalar Chocolatey como alternativa..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Success "Chocolatey instalado com sucesso!"
        return "choco"
    } catch {
        Write-Error "Falha ao instalar gerenciador de pacotes."
        return $null
    }
}

# ============================================================================
# VERIFICAÇÃO DE DEPENDÊNCIAS
# ============================================================================

function Test-NodeJS {
    try {
        $nodeVersion = & node --version 2>$null
        if ($nodeVersion) {
            $major = [int]($nodeVersion -replace 'v', '' -split '\.')[0]
            return @{
                Installed = $true
                Version = $nodeVersion
                MeetsRequirement = $major -ge $REQUIRED_NODE_VERSION
            }
        }
    } catch {}
    return @{ Installed = $false; Version = $null; MeetsRequirement = $false }
}

function Test-Blender {
    $blenderPaths = @(
        "$env:ProgramFiles\Blender Foundation\Blender 4.2\blender.exe",
        "$env:ProgramFiles\Blender Foundation\Blender 4.1\blender.exe",
        "$env:ProgramFiles\Blender Foundation\Blender 4.0\blender.exe",
        "$env:ProgramFiles\Blender Foundation\Blender 3.6\blender.exe",
        "$env:ProgramFiles(x86)\Steam\steamapps\common\Blender\blender.exe",
        "$env:LOCALAPPDATA\Programs\Blender Foundation\Blender 4.2\blender.exe"
    )
    
    foreach ($path in $blenderPaths) {
        if (Test-Path $path) {
            try {
                $version = & $path --version 2>$null | Select-Object -First 1
                return @{
                    Installed = $true
                    Path = $path
                    Version = $version
                }
            } catch {}
        }
    }
    
    # Tenta encontrar no PATH
    $blenderCmd = Get-Command blender -ErrorAction SilentlyContinue
    if ($blenderCmd) {
        return @{
            Installed = $true
            Path = $blenderCmd.Source
            Version = "Unknown"
        }
    }
    
    return @{ Installed = $false; Path = $null; Version = $null }
}

function Test-FFmpeg {
    try {
        $ffmpegVersion = & ffmpeg -version 2>$null | Select-Object -First 1
        if ($ffmpegVersion) {
            return @{
                Installed = $true
                Version = $ffmpegVersion
            }
        }
    } catch {}
    return @{ Installed = $false; Version = $null }
}

function Test-Ollama {
    try {
        $ollamaVersion = & ollama --version 2>$null
        if ($ollamaVersion) {
            return @{
                Installed = $true
                Version = $ollamaVersion
            }
        }
    } catch {}
    return @{ Installed = $false; Version = $null }
}

function Test-Git {
    try {
        $gitVersion = & git --version 2>$null
        if ($gitVersion) {
            return @{ Installed = $true; Version = $gitVersion }
        }
    } catch {}
    return @{ Installed = $false; Version = $null }
}

# ============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================================================

function Install-Dependency {
    param(
        [string]$Name,
        [string]$WingetId,
        [string]$ChocoId,
        [string]$ScoopId
    )
    
    $pm = Get-PackageManager
    
    Write-Status "Instalando $Name..."
    
    try {
        switch ($pm) {
            "winget" {
                & winget install --id $WingetId --silent --accept-package-agreements --accept-source-agreements
            }
            "choco" {
                & choco install $ChocoId -y --no-progress
            }
            "scoop" {
                & scoop install $ScoopId
            }
        }
        Write-Success "$Name instalado com sucesso!"
        return $true
    } catch {
        Write-Error "Falha ao instalar $Name : $_"
        return $false
    }
}

# ============================================================================
# CONFIGURAÇÃO DO AMBIENTE
# ============================================================================

function Initialize-AethelEnvironment {
    Write-Status "Configurando ambiente Aethel..."
    
    # Criar diretório de dados
    if (-not (Test-Path $AETHEL_DATA_DIR)) {
        New-Item -ItemType Directory -Path $AETHEL_DATA_DIR -Force | Out-Null
        Write-Success "Diretório de dados criado: $AETHEL_DATA_DIR"
    }
    
    # Criar subdiretórios
    $subdirs = @("cache", "logs", "projects", "assets", "config")
    foreach ($dir in $subdirs) {
        $path = Join-Path $AETHEL_DATA_DIR $dir
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
    
    # Criar arquivo de configuração inicial
    $configPath = Join-Path $AETHEL_DATA_DIR "config\settings.json"
    if (-not (Test-Path $configPath)) {
        $config = @{
            version = "1.0.0"
            installedAt = (Get-Date).ToString("o")
            paths = @{
                blender = $null
                ffmpeg = $null
                ollama = $null
            }
            preferences = @{
                theme = "dark"
                autoUpdate = $true
                telemetry = $false
            }
        }
        $config | ConvertTo-Json -Depth 5 | Set-Content $configPath
        Write-Success "Configuração inicial criada"
    }
    
    return $true
}

function Save-DetectedPaths {
    param(
        [hashtable]$Blender,
        [hashtable]$FFmpeg,
        [hashtable]$Ollama
    )
    
    $configPath = Join-Path $AETHEL_DATA_DIR "config\settings.json"
    
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        
        if ($Blender.Installed -and $Blender.Path) {
            $config.paths.blender = $Blender.Path
        }
        
        $config | ConvertTo-Json -Depth 5 | Set-Content $configPath
        Write-Success "Caminhos salvos na configuração"
    }
}

# ============================================================================
# MAIN
# ============================================================================

function Main {
    if (-not $Silent) {
        Show-Banner
    }
    
    Write-Host ""
    Write-Status "Iniciando verificação de dependências..."
    Write-Host ""
    
    # Verificar se está rodando como Admin
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Warning "Para instalar dependências, execute como Administrador."
        Write-Warning "Continuando em modo de verificação apenas..."
        Write-Host ""
    }
    
    # Resultados
    $results = @{
        Node = Test-NodeJS
        Blender = Test-Blender
        FFmpeg = Test-FFmpeg
        Ollama = Test-Ollama
        Git = Test-Git
    }
    
    # Exibir status
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "                    VERIFICAÇÃO DE DEPENDÊNCIAS                " -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""
    
    # Node.js
    if ($results.Node.Installed) {
        if ($results.Node.MeetsRequirement) {
            Write-Success "Node.js: $($results.Node.Version) (OK)"
        } else {
            Write-Warning "Node.js: $($results.Node.Version) (Requer v$REQUIRED_NODE_VERSION+)"
        }
    } else {
        Write-Error "Node.js: NÃO INSTALADO"
    }
    
    # Blender
    if ($results.Blender.Installed) {
        Write-Success "Blender: $($results.Blender.Version)"
        Write-Host "         Path: $($results.Blender.Path)" -ForegroundColor Gray
    } else {
        Write-Error "Blender: NÃO INSTALADO"
    }
    
    # FFmpeg
    if ($results.FFmpeg.Installed) {
        Write-Success "FFmpeg: Instalado"
    } else {
        Write-Warning "FFmpeg: NÃO INSTALADO (Opcional para edição de vídeo)"
    }
    
    # Ollama
    if ($results.Ollama.Installed) {
        Write-Success "Ollama: $($results.Ollama.Version)"
    } else {
        Write-Warning "Ollama: NÃO INSTALADO (Opcional - IA local)"
    }
    
    # Git
    if ($results.Git.Installed) {
        Write-Success "Git: $($results.Git.Version)"
    } else {
        Write-Warning "Git: NÃO INSTALADO (Opcional)"
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    # Verificar o que precisa instalar
    $needsInstall = @()
    
    if (-not $results.Node.Installed -or -not $results.Node.MeetsRequirement) {
        if (-not $SkipNode) { $needsInstall += "Node.js" }
    }
    if (-not $results.Blender.Installed) {
        if (-not $SkipBlender) { $needsInstall += "Blender" }
    }
    if (-not $results.FFmpeg.Installed) {
        if (-not $SkipFFmpeg) { $needsInstall += "FFmpeg" }
    }
    if (-not $results.Ollama.Installed) {
        if (-not $SkipOllama) { $needsInstall += "Ollama" }
    }
    
    # Instalar se necessário
    if ($needsInstall.Count -gt 0 -and $isAdmin) {
        Write-Host ""
        Write-Status "Dependências a instalar: $($needsInstall -join ', ')"
        Write-Host ""
        
        # Verificar gerenciador de pacotes
        $pm = Get-PackageManager
        if (-not $pm) {
            $pm = Install-PackageManager
        }
        
        if ($pm) {
            Write-Success "Usando gerenciador: $pm"
            Write-Host ""
            
            foreach ($dep in $needsInstall) {
                switch ($dep) {
                    "Node.js" {
                        Install-Dependency -Name "Node.js LTS" -WingetId "OpenJS.NodeJS.LTS" -ChocoId "nodejs-lts" -ScoopId "nodejs-lts"
                    }
                    "Blender" {
                        Install-Dependency -Name "Blender" -WingetId "BlenderFoundation.Blender" -ChocoId "blender" -ScoopId "blender"
                    }
                    "FFmpeg" {
                        Install-Dependency -Name "FFmpeg" -WingetId "Gyan.FFmpeg" -ChocoId "ffmpeg" -ScoopId "ffmpeg"
                    }
                    "Ollama" {
                        Install-Dependency -Name "Ollama" -WingetId "Ollama.Ollama" -ChocoId "ollama" -ScoopId "ollama"
                    }
                }
            }
        }
    }
    
    # Configurar ambiente
    Write-Host ""
    Initialize-AethelEnvironment
    
    # Re-verificar e salvar caminhos
    $finalResults = @{
        Blender = Test-Blender
        FFmpeg = Test-FFmpeg
        Ollama = Test-Ollama
    }
    Save-DetectedPaths -Blender $finalResults.Blender -FFmpeg $finalResults.FFmpeg -Ollama $finalResults.Ollama
    
    # Resumo final
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "                         RESUMO FINAL                          " -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""
    
    $allGood = $results.Node.Installed -and $results.Node.MeetsRequirement -and $results.Blender.Installed
    
    if ($allGood) {
        Write-Success "✅ Ambiente pronto para Aethel Engine!"
        Write-Host ""
        Write-Host "   Próximos passos:" -ForegroundColor White
        Write-Host "   1. cd meu-repo" -ForegroundColor Gray
        Write-Host "   2. npm install" -ForegroundColor Gray
        Write-Host "   3. npm start" -ForegroundColor Gray
    } else {
        Write-Warning "⚠️  Algumas dependências estão faltando."
        Write-Host ""
        Write-Host "   Para instalar manualmente:" -ForegroundColor White
        if (-not $results.Node.Installed) {
            Write-Host "   • Node.js: https://nodejs.org/" -ForegroundColor Gray
        }
        if (-not $results.Blender.Installed) {
            Write-Host "   • Blender: https://www.blender.org/download/" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""
    
    # Retornar código de saída
    if ($allGood) {
        return 0
    } else {
        return 1
    }
}

# Executar
$exitCode = Main
exit $exitCode
