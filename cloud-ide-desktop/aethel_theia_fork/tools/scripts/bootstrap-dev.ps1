param(
  [switch]$InstallDeps,
  [switch]$InstallPlaywrightBrowsers
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host "[aethel_theia_fork] bootstrap-dev.ps1: root = $root"

if ($InstallDeps) {
  Write-Host "Instalando dependências do workspace (npm install)..."
  npm install
}

if ($InstallPlaywrightBrowsers) {
  Write-Host "Instalando browsers do Playwright..."
  npm run playwright:install
}

Write-Host "Bootstrap concluído. Próximos comandos úteis:"
Write-Host "- npm run dev:mock-backend"
Write-Host "- npm run test:ai-ide"
Write-Host "- npm run test:e2e"
