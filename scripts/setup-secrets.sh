#!/bin/bash
# =============================================================================
# Aethel Engine - Setup de Secrets para Desenvolvimento/Produção
# =============================================================================
# Este script gera secrets seguros e configura o ambiente.
# Uso: ./scripts/setup-secrets.sh [env]
# Onde [env] pode ser: dev, staging, production
# =============================================================================

set -e

ENV=${1:-dev}
ENV_FILE=".env.${ENV}"

echo "🔐 Aethel Engine - Setup de Secrets"
echo "===================================="
echo "Ambiente: ${ENV}"
echo ""

# Função para gerar secret seguro
generate_secret() {
    openssl rand -base64 $1 2>/dev/null || head -c $1 /dev/urandom | base64
}

# Função para gerar password alfanumérico
generate_password() {
    openssl rand -base64 $1 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c $1 || \
    head -c $1 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c $1
}

# Verificar se já existe arquivo .env
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  Arquivo ${ENV_FILE} já existe!"
    read -p "Deseja sobrescrever? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelado."
        exit 1
    fi
fi

echo "📝 Gerando secrets seguros..."

# Gerar valores
POSTGRES_PASSWORD=$(generate_password 32)
JWT_SECRET=$(generate_secret 64)
SESSION_SECRET=$(generate_secret 64)

# Definir APP_URL baseado no ambiente
case $ENV in
    production)
        APP_URL="https://your-domain.com"
        NODE_ENV="production"
        ;;
    staging)
        APP_URL="https://staging.your-domain.com"
        NODE_ENV="staging"
        ;;
    *)
        APP_URL="http://localhost:3000"
        NODE_ENV="development"
        ;;
esac

# Criar arquivo .env
cat > "$ENV_FILE" << EOF
# =============================================================================
# Aethel Engine - Ambiente: ${ENV}
# Gerado em: $(date -Iseconds)
# =============================================================================
# ⚠️ NUNCA COMMITE ESTE ARQUIVO!
# =============================================================================

# Database
POSTGRES_USER=aethel
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=aethel_${ENV}

# Security
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Application
NODE_ENV=${NODE_ENV}
NEXT_PUBLIC_APP_URL=${APP_URL}

# Redis (deixe vazio para usar default sem auth)
# REDIS_PASSWORD=

EOF

echo ""
echo "✅ Arquivo ${ENV_FILE} criado com sucesso!"
echo ""
echo "📋 Resumo dos secrets gerados:"
echo "   - POSTGRES_PASSWORD: ****${POSTGRES_PASSWORD: -4}"
echo "   - JWT_SECRET: ****${JWT_SECRET: -8}"
echo "   - SESSION_SECRET: ****${SESSION_SECRET: -8}"
echo ""
echo "🔒 Próximos passos:"
echo "   1. Revise o arquivo ${ENV_FILE}"
echo "   2. Adicione configurações de serviços externos (OpenAI, S3, etc.)"
echo "   3. Para usar: cp ${ENV_FILE} .env"
echo ""

# Criar .env symlink para dev por padrão
if [ "$ENV" = "dev" ] && [ ! -f ".env" ]; then
    echo "🔗 Criando link simbólico .env -> .env.dev"
    ln -s "$ENV_FILE" .env
fi

echo "🎉 Setup completo!"
