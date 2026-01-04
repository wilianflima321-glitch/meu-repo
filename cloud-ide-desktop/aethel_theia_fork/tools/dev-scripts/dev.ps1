param(
  [switch]$StartMockBackend = $true
)

$ErrorActionPreference = 'Stop'

# Garante que este script rode a partir do root do aethel_theia_fork.
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

Write-Host "[aethel_theia_fork] dev.ps1: root = $root"

if ($StartMockBackend) {
  Write-Host "Iniciando mock backend (PORT=8010 por padrão)..."
  npm run dev:mock-backend
} else {
  Write-Host "StartMockBackend desabilitado. Nenhuma ação executada."
}
