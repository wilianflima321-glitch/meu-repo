/**
 * AETHEL ENGINE - Marketplace Cart API
 * 
 * Gerencia o carrinho de compras do marketplace.
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
      return NextResponse.json({ items: [], count: 0 });
    }
    
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ items: [], count: 0 });
    }

    const cartItems = await prisma.marketplaceCartItem.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      items: cartItems.map(item => ({
        assetId: item.itemId,
        quantity: item.quantity,
        addedAt: item.createdAt.toISOString(),
      })),
      count: cartItems.length 
    });
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar carrinho' },
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
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'ID do asset é obrigatório' },
        { status: 400 }
      );
    }

    // Upsert to add or update quantity
    await prisma.marketplaceCartItem.upsert({
      where: {
        userId_itemId: {
          userId: payload.userId,
          itemId: assetId,
        },
      },
      update: {
        quantity: { increment: 1 },
      },
      create: {
        userId: payload.userId,
        itemId: assetId,
        quantity: 1,
      },
    });

    const count = await prisma.marketplaceCartItem.count({
      where: { userId: payload.userId },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Asset adicionado ao carrinho',
      count 
    });
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    return NextResponse.json(
      { error: 'Falha ao adicionar ao carrinho' },
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
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      // Limpar todo o carrinho
      await prisma.marketplaceCartItem.deleteMany({
        where: { userId: payload.userId },
      });
    } else {
      // Remover item específico
      await prisma.marketplaceCartItem.deleteMany({
        where: {
          userId: payload.userId,
          itemId: assetId,
        },
      });
    }

    const count = await prisma.marketplaceCartItem.count({
      where: { userId: payload.userId },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Carrinho atualizado',
      count 
    });
  } catch (error) {
    console.error('Erro ao remover do carrinho:', error);
    return NextResponse.json(
      { error: 'Falha ao remover do carrinho' },
      { status: 500 }
    );
  }
}

