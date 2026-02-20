/**
 * Aethel Engine OpenAPI path definitions
 */

import type { OpenAPIV3 } from 'openapi-types';

export const openApiPaths: OpenAPIV3.PathsObject = {
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
    '/api/ai/image/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate image with selected provider',
        operationId: 'aiImageGenerate',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIImageGenerateRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Image generation accepted and completed in-request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIImageGenerateResponse',
                },
              },
            },
          },
          '503': {
            description: 'Requested provider not configured',
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
    '/api/ai/voice/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate voice audio from text with selected provider',
        operationId: 'aiVoiceGenerate',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIVoiceGenerateRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Voice audio generated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIVoiceGenerateResponse',
                },
              },
            },
          },
          '503': {
            description: 'Requested provider not configured',
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
    '/api/ai/music/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate music with selected provider',
        operationId: 'aiMusicGenerate',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AIMusicGenerateRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Music generation task created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AIMusicGenerateResponse',
                },
              },
            },
          },
          '503': {
            description: 'Requested provider not configured',
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
    '/api/ai/3d/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate 3D model task with selected provider',
        operationId: 'ai3dGenerate',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AI3DGenerateRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: '3D generation task created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AI3DGenerateResponse',
                },
              },
            },
          },
          '503': {
            description: 'Requested provider not configured',
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
  }
