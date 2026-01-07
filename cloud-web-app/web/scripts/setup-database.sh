#!/bin/bash
# =============================================================================
# Aethel Database Setup Script
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

set -e

echo "🔧 Aethel Database Setup"
echo "========================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Create .env with DATABASE_URL variable"
    exit 1
fi

# Check DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL not found in .env!"
    exit 1
fi

echo "✅ .env file found"

# Generate Prisma Client
echo ""
echo "📦 Generating Prisma Client..."
npx prisma generate

# Create migrations
echo ""
echo "🗄️ Creating database migrations..."
npx prisma migrate dev --name init

# Seed database (optional)
echo ""
read -p "🌱 Run database seed? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db seed
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start the server"
echo "2. Access http://localhost:3000"
