import type { OpenAPIV3 } from 'openapi-types';

export const openApiComponents: OpenAPIV3.ComponentsObject = {
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
      AICompleteRequest: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Código atual' },
          language: { type: 'string', enum: ['typescript', 'javascript', 'glsl'] },
          cursorPosition: { type: 'integer' },
          maxTokens: { type: 'integer', default: 100 },
        },
        required: ['code', 'language'],
      },
      AICompleteResponse: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                confidence: { type: 'number' },
                documentation: { type: 'string' },
              },
            },
          },
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
  };
