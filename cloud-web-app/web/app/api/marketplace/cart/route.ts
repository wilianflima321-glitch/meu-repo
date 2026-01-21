/**
 * AETHEL ENGINE - Marketplace Cart API
 * 
 * Gerencia o carrinho de compras do marketplace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

interface CartItem {
  assetId: string;
  addedAt: string;
}

// Mock de dados - Substituir por banco de dados real
const userCarts: Record<string, CartItem[]> = {};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    const cart = userCarts[userId] || [];

    return NextResponse.json({ 
      items: cart,
      count: cart.length 
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
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'ID do asset é obrigatório' },
        { status: 400 }
      );
    }

    if (!userCarts[userId]) {
      userCarts[userId] = [];
    }

    // Verificar se já está no carrinho
    const exists = userCarts[userId].some(item => item.assetId === assetId);
    if (exists) {
      return NextResponse.json(
        { error: 'Asset já está no carrinho' },
        { status: 400 }
      );
    }

    userCarts[userId].push({
      assetId,
      addedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Asset adicionado ao carrinho',
      count: userCarts[userId].length 
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
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      // Limpar todo o carrinho
      userCarts[userId] = [];
    } else {
      // Remover item específico
      if (userCarts[userId]) {
        userCarts[userId] = userCarts[userId].filter(item => item.assetId !== assetId);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Carrinho atualizado',
      count: userCarts[userId]?.length || 0 
    });
  } catch (error) {
    console.error('Erro ao remover do carrinho:', error);
    return NextResponse.json(
      { error: 'Falha ao remover do carrinho' },
      { status: 500 }
    );
  }
}
