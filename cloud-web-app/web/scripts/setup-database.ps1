# =============================================================================
# Aethel Database Setup Script (Windows)
# =============================================================================
# 
# Este script configura o banco de dados PostgreSQL com Prisma.
# 
# PRÉ-REQUISITOS:
# 1. PostgreSQL rodando (local ou Docker)
# 2. Variável DATABASE_URL definida em .env
# 
# EXEMPLO DATABASE_URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/aethel?schema=public"
#
# =============================================================================

Write-Host "🔧 Aethel Database Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Create .env with DATABASE_URL variable"
    exit 1
}

# Check DATABASE_URL
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "DATABASE_URL") {
    Write-Host "❌ DATABASE_URL not found in .env!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green

# Generate Prisma Client
Write-Host ""
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Create migrations
Write-Host ""
Write-Host "🗄️ Creating database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

# Seed database (optional)
Write-Host ""
$response = Read-Host "🌱 Run database seed? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    npx prisma db seed
}

Write-Host ""
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm run dev' to start the server"
Write-Host "2. Access http://localhost:3000"
