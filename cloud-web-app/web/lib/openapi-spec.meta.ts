import type { OpenAPIV3 } from 'openapi-types';

export const openApiInfo: OpenAPIV3.InfoObject = {
    title: 'Aethel Engine API',
    version: '2.0.0',
    description: `
# Aethel Engine API

API REST completa para a plataforma Aethel Engine - Game Development IDE no navegador.

## Autenticação

A API usa JWT Bearer tokens. Obtenha um token através do endpoint \`/api/auth/login\`.

\`\`\`bash
curl -X POST https://api.aethel.io/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "****"}'
\`\`\`

Use o token retornado em todas as requisições subsequentes:

\`\`\`bash
curl https://api.aethel.io/api/projects \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Rate Limiting

- 100 requisições por minuto para endpoints autenticados
- 20 requisições por minuto para endpoints públicos

## Webhooks

Configure webhooks em \`/api/webhooks\` para receber eventos em tempo real.
    `,
    contact: {
      name: 'Aethel Engine Support',
      email: 'support@aethel.io',
      url: 'https://aethel.io/docs',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  };

export const openApiServers: OpenAPIV3.ServerObject[] = [
    {
      url: 'https://api.aethel.io',
      description: 'Production',
    },
    {
      url: 'https://staging-api.aethel.io',
      description: 'Staging',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local Development',
    },
  ];

export const openApiTags: OpenAPIV3.TagObject[] = [
    { name: 'Auth', description: 'Autenticação e autorização' },
    { name: 'Projects', description: 'Gerenciamento de projetos de jogos' },
    { name: 'Assets', description: 'Upload e gerenciamento de assets' },
    { name: 'AI', description: 'Assistente de IA para código e assets' },
    { name: 'Build', description: 'Build e deploy de jogos' },
    { name: 'Collaboration', description: 'Colaboração em tempo real' },
    { name: 'Users', description: 'Gerenciamento de usuários' },
    { name: 'Analytics', description: 'Métricas e analytics' },
  ];
