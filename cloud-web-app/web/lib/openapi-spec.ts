/**
 * Aethel Engine API - OpenAPI 3.0 Specification
 * 
 * Documentação completa da API REST da plataforma.
 */

import { OpenAPIV3 } from 'openapi-types';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
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
  },
  servers: [
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
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação e autorização' },
    { name: 'Projects', description: 'Gerenciamento de projetos de jogos' },
    { name: 'Assets', description: 'Upload e gerenciamento de assets' },
    { name: 'AI', description: 'Assistente de IA para código e assets' },
    { name: 'Build', description: 'Build e deploy de jogos' },
    { name: 'Collaboration', description: 'Colaboração em tempo real' },
    { name: 'Users', description: 'Gerenciamento de usuários' },
    { name: 'Analytics', description: 'Métricas e analytics' },
  ],
  paths: {
    // =========================================================================
    // AUTH
    // =========================================================================
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login de usuário',
        description: 'Autentica um usuário e retorna JWT tokens',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
              example: {
                email: 'developer@aethel.io',
                password: 'securePassword123',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login bem-sucedido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': {
            description: 'Credenciais inválidas',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registro de novo usuário',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Usuário criado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar token de acesso',
        operationId: 'refreshToken',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token renovado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
        },
      },
    },
    // =========================================================================
    // PROJECTS
    // =========================================================================
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'Listar projetos do usuário',
        operationId: 'listProjects',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'archived', 'all'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de projetos',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProjectList',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Criar novo projeto',
        operationId: 'createProject',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateProjectRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Projeto criado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Project',
                },
              },
            },
          },
        },
      },
    },
    '/api/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Obter detalhes do projeto',
        operationId: 'getProject',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes do projeto',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Project',
                },
              },
            },
          },
          '404': {
            description: 'Projeto não encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Atualizar projeto',
        operationId: 'updateProject',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateProjectRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Projeto atualizado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Project',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Deletar projeto',
        operationId: 'deleteProject',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '204': {
            description: 'Projeto deletado',
          },
        },
      },
    },
    // =========================================================================
    // ASSETS
    // =========================================================================
    '/api/assets': {
      get: {
        tags: ['Assets'],
        summary: 'Listar assets do projeto',
        operationId: 'listAssets',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'projectId',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['model', 'texture', 'audio', 'script', 'scene', 'prefab'],
            },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de assets',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AssetList',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Assets'],
        summary: 'Upload de asset',
        operationId: 'uploadAsset',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                  projectId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  path: {
                    type: 'string',
                    description: 'Caminho dentro do projeto (ex: /assets/models/)',
                  },
                  metadata: {
                    type: 'object',
                    description: 'Metadados customizados',
                  },
                },
                required: ['file', 'projectId'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Asset criado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Asset',
                },
              },
            },
          },
        },
      },
    },
    // =========================================================================
    // AI
    // =========================================================================
    '/api/ai/complete': {
      post: {
        tags: ['AI'],
        summary: 'Inline code completion',
        description: 'Returns canonical ghost-text completion payload for editor inline suggestions.',
        operationId: 'aiCodeComplete',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AICompleteRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Completion result',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AICompleteResponse',
                },
              },
            },
          },
          '501': {
            description: 'AI provider not configured',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CapabilityError',
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/generate-asset': {
      post: {
        tags: ['AI'],
        summary: 'Gerar asset com IA',
        description: 'Gera modelos 3D, texturas ou áudio usando IA generativa',
        operationId: 'aiGenerateAsset',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIGenerateAssetRequest',
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Geração iniciada',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIGenerationJob',
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/chat': {
      post: {
        tags: ['AI'],
        summary: 'Chat com assistente IA',
        operationId: 'aiChat',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIChatRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resposta do assistente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIChatResponse',
                },
              },
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Server-Sent Events para streaming',
                },
              },
            },
          },
        },
      },
    },

    '/api/ai/change/validate': {
      post: {
        tags: ['AI'],
        summary: 'Validate AI code patch',
        description: 'Runs deterministic checks before apply.',
        operationId: 'aiValidateChange',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIChangeValidateRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIChangeValidateResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/change/apply': {
      post: {
        tags: ['AI'],
        summary: 'Apply validated AI patch',
        description: 'Applies a scoped patch and returns rollback token metadata.',
        operationId: 'aiApplyChange',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIChangeApplyRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Patch applied',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIChangeApplyResponse',
                },
              },
            },
          },
          '409': {
            description: 'Stale context',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CapabilityError',
                },
              },
            },
          },
          '422': {
            description: 'Validation blocked',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CapabilityError',
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/change/rollback': {
      post: {
        tags: ['AI'],
        summary: 'Rollback AI patch by token',
        description: 'Restores previous content for last applied AI patch token.',
        operationId: 'aiRollbackChange',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIChangeRollbackRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rollback applied',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIChangeRollbackResponse',
                },
              },
            },
          },
          '404': {
            description: 'Rollback token invalid',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CapabilityError',
                },
              },
            },
          },
          '409': {
            description: 'Rollback stale context',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CapabilityError',
                },
              },
            },
          },
        },
      },
    },
    // =========================================================================
    // BUILD
    // =========================================================================
    '/api/build': {
      post: {
        tags: ['Build'],
        summary: 'Iniciar build do jogo',
        operationId: 'startBuild',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/BuildRequest',
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Build iniciado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BuildJob',
                },
              },
            },
          },
        },
      },
    },
    '/api/build/{buildId}': {
      get: {
        tags: ['Build'],
        summary: 'Status do build',
        operationId: 'getBuildStatus',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'buildId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Status atual',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BuildJob',
                },
              },
            },
          },
        },
      },
    },
    // =========================================================================
    // HEALTH
    // =========================================================================
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Sistema saudável',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Auth
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
        required: ['email', 'password'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          username: { type: 'string' },
        },
        required: ['email', 'password', 'name'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      // User
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          username: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Project
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          template: { type: 'string', enum: ['2d-platformer', '3d-fps', 'rpg', 'puzzle', 'blank'] },
          status: { type: 'string', enum: ['active', 'archived', 'building'] },
          thumbnail: { type: 'string', format: 'uri' },
          settings: {
            type: 'object',
            properties: {
              resolution: { type: 'object' },
              physics: { type: 'string', enum: ['rapier', 'cannon', 'none'] },
              renderer: { type: 'string', enum: ['webgl', 'webgpu'] },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProjectList: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Project' },
          },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          template: { type: 'string', enum: ['2d-platformer', '3d-fps', 'rpg', 'puzzle', 'blank'] },
        },
        required: ['name', 'template'],
      },
      UpdateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived'] },
          settings: { type: 'object' },
        },
      },
      // Asset
      Asset: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['model', 'texture', 'audio', 'script', 'scene', 'prefab'] },
          path: { type: 'string' },
          size: { type: 'integer' },
          mimeType: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          thumbnailUrl: { type: 'string', format: 'uri' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AssetList: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Asset' },
          },
          total: { type: 'integer' },
        },
      },
      // AI
      CapabilityError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          capability: { type: 'string' },
          capabilityStatus: { type: 'string', enum: ['IMPLEMENTED', 'PARTIAL', 'NOT_IMPLEMENTED', 'DEPRECATED'] },
          milestone: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['error', 'message', 'capability', 'capabilityStatus'],
      },
      AICompleteRequest: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          prefix: { type: 'string' },
          suffix: { type: 'string' },
          language: { type: 'string' },
          filepath: { type: 'string' },
          maxTokens: { type: 'integer', default: 256 },
          temperature: { type: 'number', default: 0.1 },
          provider: { type: 'string' },
          model: { type: 'string' },
        },
      },
      AICompleteResponse: {
        type: 'object',
        properties: {
          suggestion: { type: 'string' },
          text: { type: 'string', description: 'Compatibility alias for legacy consumers' },
          provider: { type: 'string' },
          model: { type: 'string' },
          tokensUsed: { type: 'integer' },
          latencyMs: { type: 'integer' },
        },
        required: ['suggestion'],
      },
      AIChangeValidateRequest: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          modified: { type: 'string' },
          fullDocument: { type: 'string' },
          language: { type: 'string' },
          filePath: { type: 'string' },
        },
        required: ['original', 'modified'],
      },
      AIChangeValidateResponse: {
        type: 'object',
        properties: {
          canApply: { type: 'boolean' },
          verdict: { type: 'string' },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        required: ['canApply'],
      },
      AIChangeApplyRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          filePath: { type: 'string' },
          original: { type: 'string' },
          modified: { type: 'string' },
          language: { type: 'string' },
          range: {
            type: 'object',
            properties: {
              startOffset: { type: 'integer' },
              endOffset: { type: 'integer' },
            },
          },
        },
        required: ['projectId', 'filePath', 'original', 'modified'],
      },
      AIChangeApplyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          capability: { type: 'string' },
          capabilityStatus: { type: 'string' },
          projectId: { type: 'string' },
          filePath: { type: 'string' },
          content: { type: 'string' },
          hashBefore: { type: 'string' },
          hashAfter: { type: 'string' },
          rollback: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      AIChangeRollbackRequest: {
        type: 'object',
        properties: {
          rollbackToken: { type: 'string' },
        },
        required: ['rollbackToken'],
      },
      AIChangeRollbackResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          capability: { type: 'string' },
          capabilityStatus: { type: 'string' },
          projectId: { type: 'string' },
          filePath: { type: 'string' },
          hash: { type: 'string' },
          content: { type: 'string' },
          restoredAt: { type: 'string', format: 'date-time' },
        },
      },
      AIGenerateAssetRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['model', 'texture', 'audio', 'sprite'] },
          prompt: { type: 'string' },
          style: { type: 'string' },
          projectId: { type: 'string', format: 'uuid' },
        },
        required: ['type', 'prompt', 'projectId'],
      },
      AIGenerationJob: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['queued', 'processing', 'completed', 'failed'] },
          progress: { type: 'number' },
          resultUrl: { type: 'string', format: 'uri' },
        },
      },
      AIChatRequest: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          context: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              currentFile: { type: 'string' },
              selectedCode: { type: 'string' },
            },
          },
          stream: { type: 'boolean', default: false },
        },
        required: ['message'],
      },
      AIChatResponse: {
        type: 'object',
        properties: {
          response: { type: 'string' },
          codeBlocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                language: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      // Build
      BuildRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          platform: {
            type: 'string',
            enum: ['web', 'windows', 'macos', 'linux', 'android', 'ios'],
          },
          configuration: { type: 'string', enum: ['debug', 'release'] },
          optimizations: {
            type: 'object',
            properties: {
              minify: { type: 'boolean' },
              compress: { type: 'boolean' },
              treeshake: { type: 'boolean' },
            },
          },
        },
        required: ['projectId', 'platform'],
      },
      BuildJob: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['queued', 'building', 'completed', 'failed'] },
          progress: { type: 'number' },
          logs: { type: 'array', items: { type: 'string' } },
          artifactUrl: { type: 'string', format: 'uri' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
      // Health
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          version: { type: 'string' },
          uptime: { type: 'integer' },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string', enum: ['up', 'down'] },
              redis: { type: 'string', enum: ['up', 'down'] },
              ai: { type: 'string', enum: ['up', 'down'] },
            },
          },
        },
      },
      // Errors
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          fields: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
