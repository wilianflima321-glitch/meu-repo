/**
 * Aethel Engine OpenAPI component definitions
 */

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
      AIImageGenerateRequest: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          provider: { type: 'string', enum: ['dalle', 'stable-diffusion', 'flux'] },
          size: { type: 'string' },
          style: { type: 'string' },
          quality: { type: 'string', enum: ['standard', 'hd'] },
          n: { type: 'integer', minimum: 1 },
        },
        required: ['prompt'],
      },
      AIImageGenerateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          provider: { type: 'string' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                revisedPrompt: { type: 'string' },
              },
              required: ['url'],
            },
          },
          metadata: { type: 'object' },
        },
        required: ['success', 'provider', 'images'],
      },
      AIVoiceGenerateRequest: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          provider: { type: 'string', enum: ['elevenlabs', 'openai', 'azure'] },
          voice: { type: 'string' },
          emotion: { type: 'string' },
          speed: { type: 'number' },
          pitch: { type: 'number' },
          format: { type: 'string', enum: ['mp3', 'wav', 'ogg'] },
        },
        required: ['text'],
      },
      AIVoiceGenerateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          provider: { type: 'string' },
          audio: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              mimeType: { type: 'string' },
              format: { type: 'string' },
              size: { type: 'integer' },
            },
          },
          metadata: { type: 'object' },
        },
        required: ['success', 'provider', 'audio'],
      },
      AIMusicGenerateRequest: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['suno', 'musicgen'] },
          prompt: { type: 'string' },
          genre: { type: 'string' },
          mood: { type: 'string' },
          duration: { type: 'integer' },
          tempo: { type: 'string', enum: ['slow', 'medium', 'fast'] },
          instrumental: { type: 'boolean' },
          lyrics: { type: 'string' },
          referenceUrl: { type: 'string', format: 'uri' },
        },
        required: ['prompt'],
      },
      AIMusicGenerateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          provider: { type: 'string' },
          task: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              checkStatusUrl: { type: 'string' },
            },
          },
          metadata: { type: 'object' },
        },
        required: ['success', 'provider', 'task'],
      },
      AI3DGenerateRequest: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['meshy', 'tripo3d'] },
          mode: { type: 'string', enum: ['text-to-3d', 'image-to-3d'] },
          prompt: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          imageBase64: { type: 'string' },
          style: { type: 'string' },
          format: { type: 'string' },
          quality: { type: 'string', enum: ['draft', 'standard', 'high'] },
          targetPolycount: { type: 'integer' },
          negativePrompt: { type: 'string' },
        },
        required: ['mode'],
      },
      AI3DGenerateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          provider: { type: 'string' },
          mode: { type: 'string' },
          task: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              checkStatusUrl: { type: 'string' },
            },
          },
          metadata: { type: 'object' },
        },
        required: ['success', 'provider', 'mode', 'task'],
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
  }
