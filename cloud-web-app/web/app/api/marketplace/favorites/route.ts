/**
 * AETHEL ENGINE - Marketplace Favorites API
 * 
 * Gerencia favoritos do usuário no marketplace.
 * MIGRADO: De Map() in-memory para PostgreSQL/Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ favorites: [] });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ favorites: [] });
    }

    const favorites = await prisma.marketplaceFavorite.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      favorites: favorites.map(f => f.itemId) 
    });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar favoritos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId } = body;
    
    if (!itemId) {
      return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 });
    }

    // Upsert to avoid duplicates
    await prisma.marketplaceFavorite.upsert({
      where: {
        userId_itemId: {
          userId: payload.userId,
          itemId,
        },
      },
      update: {},
      create: {
        userId: payload.userId,
        itemId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return NextResponse.json(
      { error: 'Falha ao adicionar favorito' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    if (!itemId) {
      return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 });
    }

    await prisma.marketplaceFavorite.deleteMany({
      where: {
        userId: payload.userId,
        itemId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return NextResponse.json(
      { error: 'Falha ao remover favorito' },
      { status: 500 }
    );
  }
}
