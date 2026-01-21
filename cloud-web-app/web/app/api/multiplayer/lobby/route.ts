/**
 * Multiplayer Lobby API
 * 
 * Gerenciamento de lobbies para jogos multiplayer.
 * Suporta criação, join, leave, e gerenciamento de sessões.
 * 
 * POST /api/multiplayer/lobby - Criar lobby
 * GET /api/multiplayer/lobby - Listar lobbies públicos
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-server';
import { nanoid } from 'nanoid';
import redis from '@/lib/redis-cache';
import crypto from 'crypto';

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateLobbySchema = z.object({
  name: z.string().min(3).max(50),
  gameId: z.string(),
  maxPlayers: z.number().min(2).max(64).default(8),
  isPublic: z.boolean().default(true),
  password: z.string().optional(),
  region: z.enum(['us-east', 'us-west', 'eu-west', 'eu-east', 'asia', 'auto']).default('auto'),
  gameMode: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

const ListLobbiesSchema = z.object({
  gameId: z.string().optional(),
  region: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// ============================================================================
// TIPOS
// ============================================================================

export interface Lobby {
  id: string;
  code: string;
  name: string;
  gameId: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  currentPlayers: number;
  players: LobbyPlayer[];
  isPublic: boolean;
  hasPassword: boolean;
  region: string;
  gameMode?: string;
  settings: Record<string, any>;
  status: 'waiting' | 'starting' | 'in-game' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

export interface LobbyPlayer {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  isHost: boolean;
  isReady: boolean;
  team?: string;
  joinedAt: Date;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateLobbyCode(): string {
  // Formato: XXXX-XXXX (8 caracteres alfanuméricos)
  // Usando crypto para geração segura
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 para evitar confusão
  const randomBytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

async function selectOptimalRegion(userId: string): Promise<string> {
  // Em produção, usar geolocalização do usuário
  // Por agora, retorna região padrão
  return 'us-east';
}

function getLobbyKey(lobbyId: string): string {
  return `lobby:${lobbyId}`;
}

function getPublicLobbiesKey(gameId: string, region: string): string {
  return `lobbies:public:${gameId}:${region}`;
}

// ============================================================================
// POST - Criar Lobby
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validação
    const body = await request.json();
    const data = CreateLobbySchema.parse(body);

    // Verifica se o jogo existe
    const game = await prisma.project.findUnique({
      where: { id: data.gameId },
      select: { id: true, name: true, userId: true },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Obtém dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determina região
    const region = data.region === 'auto' 
      ? await selectOptimalRegion(decoded.userId)
      : data.region;

    // Gera IDs
    const lobbyId = nanoid();
    const lobbyCode = generateLobbyCode();

    // Cria lobby
    const lobby: Lobby = {
      id: lobbyId,
      code: lobbyCode,
      name: data.name,
      gameId: data.gameId,
      hostId: decoded.userId,
      hostName: user.name || user.email.split('@')[0],
      maxPlayers: data.maxPlayers,
      currentPlayers: 1,
      players: [
        {
          id: nanoid(),
          userId: decoded.userId,
          username: user.name || user.email.split('@')[0],
          avatarUrl: user.avatar || undefined,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
      ],
      isPublic: data.isPublic,
      hasPassword: !!data.password,
      region,
      gameMode: data.gameMode,
      settings: data.settings || {},
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Salva no Redis com TTL de 2 horas
    await redis.set(
      getLobbyKey(lobbyId),
      JSON.stringify({
        ...lobby,
        password: data.password ? hashPassword(data.password) : null,
      }),
      { ttl: 7200 }
    );

    // Se público, adiciona ao índice
    if (data.isPublic) {
      await redis.zadd(
        getPublicLobbiesKey(data.gameId, region),
        Date.now(),
        lobbyId
      );
    }

    // Mapeia código para ID
    await redis.set(`lobby:code:${lobbyCode}`, lobbyId, { ttl: 7200 });

    // Resposta (sem password)
    return NextResponse.json({
      success: true,
      lobby: {
        id: lobby.id,
        code: lobby.code,
        name: lobby.name,
        gameId: lobby.gameId,
        hostId: lobby.hostId,
        hostName: lobby.hostName,
        maxPlayers: lobby.maxPlayers,
        currentPlayers: lobby.currentPlayers,
        isPublic: lobby.isPublic,
        hasPassword: lobby.hasPassword,
        region: lobby.region,
        gameMode: lobby.gameMode,
        status: lobby.status,
        createdAt: lobby.createdAt,
      },
      joinUrl: `/play/${data.gameId}/lobby/${lobbyCode}`,
      websocketUrl: `wss://multiplayer.aethel.io/${region}/lobby/${lobbyId}`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create lobby error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Listar Lobbies
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = ListLobbiesSchema.parse({
      gameId: searchParams.get('gameId'),
      region: searchParams.get('region'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!params.gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      );
    }

    const region = params.region || 'us-east';
    const offset = (params.page - 1) * params.limit;

    // Busca IDs dos lobbies públicos
    const lobbyIds = await redis.zrevrange(
      getPublicLobbiesKey(params.gameId, region),
      offset,
      offset + params.limit - 1
    );

    if (lobbyIds.length === 0) {
      return NextResponse.json({
        lobbies: [],
        total: 0,
        page: params.page,
        limit: params.limit,
      });
    }

    // Busca dados dos lobbies
    const lobbies: Lobby[] = [];
    for (const lobbyId of lobbyIds) {
      const lobbyData = await redis.get(getLobbyKey(lobbyId));
      if (lobbyData) {
        const lobby = typeof lobbyData === 'string' ? JSON.parse(lobbyData) : lobbyData;
        // Remove dados sensíveis
        delete lobby.password;
        lobbies.push(lobby);
      }
    }

    // Filtra lobbies cheios ou em jogo
    const availableLobbies = lobbies.filter(
      (l) => l.status === 'waiting' && l.currentPlayers < l.maxPlayers
    );

    const total = await redis.zcard(getPublicLobbiesKey(params.gameId, region));

    return NextResponse.json({
      lobbies: availableLobbies,
      total,
      page: params.page,
      limit: params.limit,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('List lobbies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}
