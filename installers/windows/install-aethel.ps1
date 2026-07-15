param(
    [string]$RepoRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section($message) {
    Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Gray
}

function Write-Ok($message) {
    Write-Host "[OK]   $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Err($message) {
    Write-Host "[ERR]  $message" -ForegroundColor Red
}

function Resolve-RepoRoot {
    if ($RepoRoot) {
        return (Resolve-Path $RepoRoot).Path
    }

    $root = Split-Path -Parent $PSScriptRoot
    $root = Split-Path -Parent $root
    return (Resolve-Path $root).Path
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Ensure-Node {
    Write-Section "Node.js"

    if (-not (Test-Command node)) {
        Write-Warn "Node.js não encontrado. Tentando instalar via winget..."
        if (Test-Command winget) {
            winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
        } else {
            Write-Err "winget não disponível. Instale Node.js manualmente: https://nodejs.org/"
            throw "Node.js ausente"
        }
    }

    $nodeVersion = (& node -v) -replace '^v',''
    Write-Ok "Node.js $nodeVersion"

    if (-not (Test-Command npm)) {
        Write-Err "npm não encontrado após instalação do Node.js."
        throw "npm ausente"
    }

    $npmVersion = (& npm -v)
    Write-Ok "npm $npmVersion"
}

function Install-Dependencies($targetPath, $label) {
    if (-not (Test-Path $targetPath)) {
        Write-Warn "$label: caminho não encontrado ($targetPath)"
        return
    }

    $pkgPath = Join-Path $targetPath 'package.json'
    if (-not (Test-Path $pkgPath)) {
        Write-Warn "$label: sem package.json"
        return
    }

    Write-Section "Instalando dependências: $label"
    Push-Location $targetPath
    try {
        npm install
        Write-Ok "$label: dependências instaladas"
    } finally {
        Pop-Location
    }
}

function Check-Dependency($name, $command, $hint) {
    if (Test-Command $command) {
        Write-Ok "$name detectado"
        return $true
    }

    Write-Warn "$name não encontrado. $hint"
    return $false
}

Write-Section "Aethel Engine Installer (Windows)"
$root = Resolve-RepoRoot
Write-Info "Repo root: $root"

Ensure-Node

Install-Dependencies $root 'Root workspace'
Install-Dependencies (Join-Path $root 'server') 'Server'
Install-Dependencies (Join-Path $root 'cloud-web-app\web') 'Cloud Web App'
Install-Dependencies (Join-Path $root 'cloud-ide-desktop\desktop-app') 'Desktop App'
Install-Dependencies (Join-Path $root 'cloud-ide-desktop\aethel_theia_fork') 'Theia Fork'

Write-Section "Dependências locais (opcional)"
$blenderOk = Check-Dependency 'Blender' 'blender' 'Instale: https://www.blender.org/download/'
$ollamaOk = Check-Dependency 'Ollama' 'ollama' 'Instale: https://ollama.ai/'
$ffmpegOk = Check-Dependency 'FFMPEG' 'ffmpeg' 'Instale: https://ffmpeg.org/download.html'

Write-Section "Resumo"
Write-Info "Blender: $blenderOk | Ollama: $ollamaOk | FFMPEG: $ffmpegOk"
Write-Ok "Instalação concluída. Você já pode iniciar com AETHEL_LAUNCH.ps1"