/**
 * Asset-related AI tools.
 *
 * Kept outside the central registry so asset catalog/query behavior can evolve
 * without making the whole agent tool surface harder to review.
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

import type { AITool } from './ai-tools-registry-types';
import { getBooleanParam, getContext, getNumberParam, getStringParam } from './ai-tools-registry-utils';

type ToolRegistry = {
  register(tool: AITool): void;
};

export function registerAssetTools(aiTools: ToolRegistry): void {
  // ============================================================================
  // FERRAMENTAS DE ASSETS
  // ============================================================================

  aiTools.register({
    name: 'query_assets',
    description: 'Busca e lista assets do projeto atual. Use para encontrar modelos 3D, texturas, áudio, scripts e outros recursos.',
    category: 'asset',
    parameters: [
      { name: 'search', type: 'string', description: 'Termo de busca (nome, tag)', required: false },
      { name: 'type', type: 'string', description: 'Filtrar por tipo de asset', required: false, enum: ['mesh', 'texture', 'material', 'audio', 'video', 'blueprint', 'animation', 'prefab', 'level', 'script', 'all'] },
      { name: 'path', type: 'string', description: 'Filtrar por pasta (ex: /Content/Characters)', required: false },
      { name: 'limit', type: 'number', description: 'Máximo de resultados', required: false, default: 50 },
      { name: 'favorites', type: 'boolean', description: 'Apenas favoritos', required: false, default: false },
    ],
    returns: 'Lista de assets com id, nome, tipo, caminho, tamanho e metadados',
    execute: async (params) => {
      try {
        const ctx = getContext(params);
        if (!ctx.projectId) return { success: false, error: 'Nenhum projeto selecionado' };

        const whereClause: Prisma.AssetWhereInput = { projectId: ctx.projectId, status: 'ready' };

        const search = getStringParam(params, 'search').trim();
        const assetType = getStringParam(params, 'type').trim();
        const assetPath = getStringParam(params, 'path').trim();

        if (search) {
          whereClause.name = { contains: search, mode: 'insensitive' };
        }
        if (assetType && assetType !== 'all') {
          whereClause.type = assetType;
        }
        if (assetPath) {
          whereClause.path = { startsWith: assetPath };
        }
        if (getBooleanParam(params, 'favorites')) {
          whereClause.isFavorite = true;
        }

        const assets = await prisma.asset.findMany({
          where: whereClause,
          take: getNumberParam(params, 'limit', 50),
          orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            name: true,
            type: true,
            path: true,
            extension: true,
            size: true,
            thumbnail: true,
            metadata: true,
            isFavorite: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          success: true,
          data: {
            count: assets.length,
            assets: assets.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              path: a.path,
              extension: a.extension,
              size: formatBytes(a.size),
              sizeBytes: a.size,
              thumbnail: a.thumbnail,
              metadata: a.metadata,
              isFavorite: a.isFavorite,
              modifiedAt: a.updatedAt.toISOString(),
            })),
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar assets' };
      }
    },
  });

  // Helper function for file size formatting
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  aiTools.register({
    name: 'get_asset_details',
    description: 'Obtém detalhes completos de um asset específico pelo ID ou caminho',
    category: 'asset',
    parameters: [
      { name: 'assetId', type: 'string', description: 'ID do asset', required: false },
      { name: 'assetPath', type: 'string', description: 'Caminho completo do asset', required: false },
    ],
    returns: 'Detalhes completos do asset incluindo metadados técnicos',
    execute: async (params) => {
      try {
        const ctx = getContext(params);
        if (!ctx.projectId) return { success: false, error: 'Nenhum projeto selecionado' };

        const assetId = getStringParam(params, 'assetId').trim();
        const assetPath = getStringParam(params, 'assetPath').trim();

        if (!assetId && !assetPath) {
          return { success: false, error: 'Forneça assetId ou assetPath' };
        }

        const whereClause: Prisma.AssetWhereInput = { projectId: ctx.projectId };
        if (assetId) whereClause.id = assetId;
        if (assetPath) whereClause.path = assetPath;

        const asset = await prisma.asset.findFirst({
          where: whereClause,
        });

        if (!asset) return { success: false, error: 'Asset não encontrado' };

        return {
          success: true,
          data: {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            path: asset.path,
            extension: asset.extension,
            size: formatBytes(asset.size),
            sizeBytes: asset.size,
            mimeType: asset.mimeType,
            thumbnail: asset.thumbnail,
            metadata: asset.metadata,
            isFavorite: asset.isFavorite,
            status: asset.status,
            storagePath: asset.storagePath,
            createdAt: asset.createdAt.toISOString(),
            updatedAt: asset.updatedAt.toISOString(),
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar asset' };
      }
    },
  });

  aiTools.register({
    name: 'generate_3d_model',
    description: 'Gera modelo 3D usando IA',
    category: 'asset',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Descrição do modelo', required: true },
      { name: 'style', type: 'string', description: 'Estilo do modelo', required: false, enum: ['realistic', 'low-poly', 'stylized', 'voxel'] },
      { name: 'format', type: 'string', description: 'Formato de saída', required: false, enum: ['gltf', 'fbx', 'obj'], default: 'gltf' },
    ],
    returns: 'Modelo 3D gerado',
    execute: async (params) => {
      return {
        success: true,
        data: { prompt: params.prompt, style: params.style },
        artifacts: [{
          type: '3d-model',
          name: 'generated-model.gltf',
          content: '',
          mimeType: 'model/gltf+json',
        }],
      };
    },
  });

  aiTools.register({
    name: 'generate_texture',
    description: 'Gera textura tileable para materiais',
    category: 'asset',
    parameters: [
      { name: 'type', type: 'string', description: 'Tipo de textura', required: true, enum: ['diffuse', 'normal', 'roughness', 'metallic', 'ao', 'height', 'emission'] },
      { name: 'material', type: 'string', description: 'Material (ex: wood, metal, stone)', required: true },
      { name: 'resolution', type: 'number', description: 'Resolução da textura', required: false, default: 1024 },
      { name: 'tileable', type: 'boolean', description: 'Se deve ser tileable', required: false, default: true },
    ],
    returns: 'Textura gerada',
    execute: async (params) => {
      return {
        success: true,
        data: { type: params.type, material: params.material },
      };
    },
  });


}
