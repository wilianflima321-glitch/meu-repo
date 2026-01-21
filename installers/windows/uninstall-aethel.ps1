# AETHEL ENGINE - Windows Uninstaller Script
# ===========================================
# 
# Script PowerShell para desinstalar completamente o Aethel Engine.
# Remove arquivos, atalhos, entradas de registro e dados de cache.
#
# Uso: .\uninstall-aethel.ps1 [-KeepUserData] [-Silent] [-Force]

param(
    [switch]$KeepUserData,    # Manter projetos e configurações do usuário
    [switch]$Silent,          # Execução silenciosa sem prompts
    [switch]$Force            # Forçar remoção mesmo com erros
)

$ErrorActionPreference = if ($Force) { "Continue" } else { "Stop" }

# ============================================================================
# CONFIGURATION
# ============================================================================

$AppName = "Aethel Engine"
$AppPublisher = "Aethel Team"
$DefaultInstallPath = "$env:ProgramFiles\AethelEngine"
$UserDataPath = "$env:USERPROFILE\.aethel"
$AppDataPath = "$env:APPDATA\AethelEngine"
$LocalAppDataPath = "$env:LOCALAPPDATA\AethelEngine"
$DesktopShortcut = "$env:USERPROFILE\Desktop\Aethel Engine.lnk"
$StartMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Aethel Engine"

# Registry paths
$UninstallRegPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AethelEngine"
$AppRegPath = "HKCU:\SOFTWARE\AethelEngine"

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    
    $color = switch ($Type) {
        "Info"    { "Cyan" }
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        default   { "White" }
    }
    
    if (-not $Silent) {
        Write-Host "[$Type] $Message" -ForegroundColor $color
    }
}

function Confirm-Action {
    param([string]$Message)
    
    if ($Silent -or $Force) {
        return $true
    }
    
    $response = Read-Host "$Message (Y/N)"
    return $response -match "^[Yy]"
}

function Stop-AethelProcesses {
    Write-Status "Parando processos do Aethel Engine..."
    
    $processes = @(
        "aethel-engine",
        "AethelEngine",
        "electron",
        "node"
    )
    
    foreach ($proc in $processes) {
        Get-Process -Name $proc -ErrorAction SilentlyContinue | ForEach-Object {
            $path = $_.Path
            if ($path -and $path -like "*Aethel*") {
                Write-Status "  Parando: $($_.Name) (PID: $($_.Id))" "Info"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    # Wait for processes to stop
    Start-Sleep -Seconds 2
}

function Get-InstallPath {
    # Try to get install path from registry
    if (Test-Path $UninstallRegPath) {
        $regValue = Get-ItemProperty -Path $UninstallRegPath -Name "InstallLocation" -ErrorAction SilentlyContinue
        if ($regValue -and $regValue.InstallLocation) {
            return $regValue.InstallLocation
        }
    }
    
    # Try common locations
    $locations = @(
        $DefaultInstallPath,
        "$env:ProgramFiles\Aethel Engine",
        "$env:ProgramFiles(x86)\AethelEngine",
        "$env:LOCALAPPDATA\Programs\AethelEngine"
    )
    
    foreach ($loc in $locations) {
        if (Test-Path $loc) {
            return $loc
        }
    }
    
    return $DefaultInstallPath
}

function Remove-InstallDirectory {
    param([string]$Path)
    
    if (Test-Path $Path) {
        Write-Status "Removendo diretório de instalação: $Path"
        
        try {
            # First, try to remove read-only attributes
            Get-ChildItem -Path $Path -Recurse -Force | ForEach-Object {
                $_.Attributes = 'Normal'
            }
            
            Remove-Item -Path $Path -Recurse -Force
            Write-Status "  Removido com sucesso" "Success"
        }
        catch {
            Write-Status "  Erro ao remover: $_" "Error"
            
            if ($Force) {
                # Try alternative method
                cmd /c "rd /s /q `"$Path`"" 2>$null
            }
        }
    }
    else {
        Write-Status "  Diretório não encontrado: $Path" "Warning"
    }
}

function Remove-UserData {
    Write-Status "Removendo dados do usuário..."
    
    $paths = @(
        $AppDataPath,
        $LocalAppDataPath
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            Write-Status "  Removendo: $path"
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Remove user projects only if not keeping user data
    if (-not $KeepUserData -and (Test-Path $UserDataPath)) {
        if ($Silent -or (Confirm-Action "Remover projetos e configurações do usuário em $UserDataPath?")) {
            Write-Status "  Removendo dados do usuário: $UserDataPath" "Warning"
            Remove-Item -Path $UserDataPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Remove-Shortcuts {
    Write-Status "Removendo atalhos..."
    
    # Desktop shortcut
    if (Test-Path $DesktopShortcut) {
        Remove-Item -Path $DesktopShortcut -Force
        Write-Status "  Removido atalho da área de trabalho" "Success"
    }
    
    # Start menu
    if (Test-Path $StartMenuPath) {
        Remove-Item -Path $StartMenuPath -Recurse -Force
        Write-Status "  Removido do menu iniciar" "Success"
    }
    
    # Quick launch (if exists)
    $quickLaunch = "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\Aethel Engine.lnk"
    if (Test-Path $quickLaunch) {
        Remove-Item -Path $quickLaunch -Force
    }
}

function Remove-RegistryEntries {
    Write-Status "Removendo entradas do registro..."
    
    # Uninstall entry
    if (Test-Path $UninstallRegPath) {
        Remove-Item -Path $UninstallRegPath -Recurse -Force
        Write-Status "  Removida entrada de desinstalação" "Success"
    }
    
    # App settings
    if (Test-Path $AppRegPath) {
        Remove-Item -Path $AppRegPath -Recurse -Force
        Write-Status "  Removidas configurações do app" "Success"
    }
    
    # File associations
    $extensions = @(".aethel", ".aproject")
    foreach ($ext in $extensions) {
        $assocPath = "HKCU:\SOFTWARE\Classes\$ext"
        if (Test-Path $assocPath) {
            Remove-Item -Path $assocPath -Recurse -Force
        }
    }
    
    # Protocol handler
    $protocolPath = "HKCU:\SOFTWARE\Classes\aethel"
    if (Test-Path $protocolPath) {
        Remove-Item -Path $protocolPath -Recurse -Force
    }
}

function Remove-EnvironmentVariables {
    Write-Status "Removendo variáveis de ambiente..."
    
    # User PATH
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath) {
        $installPath = Get-InstallPath
        $newPath = ($userPath -split ";" | Where-Object { $_ -notlike "*Aethel*" }) -join ";"
        if ($newPath -ne $userPath) {
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Write-Status "  Removido do PATH do usuário" "Success"
        }
    }
    
    # Aethel-specific variables
    $vars = @("AETHEL_HOME", "AETHEL_PROJECTS")
    foreach ($var in $vars) {
        $value = [Environment]::GetEnvironmentVariable($var, "User")
        if ($value) {
            [Environment]::SetEnvironmentVariable($var, $null, "User")
            Write-Status "  Removida variável: $var" "Success"
        }
    }
}

function Remove-TempFiles {
    Write-Status "Removendo arquivos temporários..."
    
    $tempPaths = @(
        "$env:TEMP\aethel-*",
        "$env:TEMP\Aethel*",
        "$env:TEMP\electron-*"
    )
    
    foreach ($pattern in $tempPaths) {
        Get-Item -Path $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Clear-BrowserCache {
    Write-Status "Limpando cache do navegador embarcado..."
    
    # Electron/Chromium cache
    $chromiumPaths = @(
        "$env:LOCALAPPDATA\AethelEngine\Cache",
        "$env:LOCALAPPDATA\AethelEngine\GPUCache",
        "$env:LOCALAPPDATA\AethelEngine\Code Cache",
        "$env:APPDATA\AethelEngine\Cache"
    )
    
    foreach ($path in $chromiumPaths) {
        if (Test-Path $path) {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

function Main {
    # Header
    if (-not $Silent) {
        Write-Host ""
        Write-Host "=======================================" -ForegroundColor Cyan
        Write-Host "  AETHEL ENGINE - Desinstalador" -ForegroundColor Cyan
        Write-Host "=======================================" -ForegroundColor Cyan
        Write-Host ""
    }
    
    # Check for admin rights
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Status "Este script precisa ser executado como Administrador" "Warning"
        
        if (-not $Silent) {
            Write-Host ""
            Write-Host "Reiniciando com privilégios de administrador..." -ForegroundColor Yellow
            
            $scriptPath = $MyInvocation.MyCommand.Path
            $args = @()
            if ($KeepUserData) { $args += "-KeepUserData" }
            if ($Silent) { $args += "-Silent" }
            if ($Force) { $args += "-Force" }
            
            Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`" $($args -join ' ')" -Verb RunAs
            exit
        }
    }
    
    # Confirmation
    if (-not $Silent -and -not $Force) {
        Write-Host "Este script irá remover completamente o Aethel Engine." -ForegroundColor Yellow
        if (-not $KeepUserData) {
            Write-Host "ATENÇÃO: Projetos e configurações do usuário também serão removidos!" -ForegroundColor Red
            Write-Host "Use -KeepUserData para preservar seus projetos." -ForegroundColor Yellow
        }
        Write-Host ""
        
        if (-not (Confirm-Action "Deseja continuar?")) {
            Write-Host "Desinstalação cancelada." -ForegroundColor Yellow
            exit 0
        }
    }
    
    $installPath = Get-InstallPath
    Write-Status "Diretório de instalação: $installPath"
    Write-Host ""
    
    # Step 1: Stop processes
    Stop-AethelProcesses
    
    # Step 2: Remove shortcuts
    Remove-Shortcuts
    
    # Step 3: Remove registry entries
    Remove-RegistryEntries
    
    # Step 4: Remove environment variables
    Remove-EnvironmentVariables
    
    # Step 5: Clear caches
    Clear-BrowserCache
    Remove-TempFiles
    
    # Step 6: Remove user data (if not keeping)
    Remove-UserData
    
    # Step 7: Remove installation directory
    Remove-InstallDirectory -Path $installPath
    
    # Done
    Write-Host ""
    Write-Host "=======================================" -ForegroundColor Green
    Write-Status "Aethel Engine foi desinstalado com sucesso!" "Success"
    Write-Host "=======================================" -ForegroundColor Green
    
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Obrigado por usar o Aethel Engine!" -ForegroundColor Cyan
        Write-Host "Esperamos vê-lo novamente em breve." -ForegroundColor Cyan
        Write-Host ""
        
        if (-not $Force) {
            Read-Host "Pressione Enter para sair"
        }
    }
}

# Run main
Main
