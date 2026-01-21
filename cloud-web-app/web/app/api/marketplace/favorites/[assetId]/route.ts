/**
 * AETHEL ENGINE - Marketplace Favorite Asset API
 * 
 * Adiciona ou remove um asset dos favoritos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock de dados - Substituir por banco de dados real
const userFavorites: Record<string, Set<string>> = {};

export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';
    const { assetId } = params;

    if (!userFavorites[userId]) {
      userFavorites[userId] = new Set();
    }

    userFavorites[userId].add(assetId);

    return NextResponse.json({ 
      success: true,
      message: 'Asset adicionado aos favoritos' 
    });
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return NextResponse.json(
      { error: 'Falha ao adicionar aos favoritos' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';
    const { assetId } = params;

    if (userFavorites[userId]) {
      userFavorites[userId].delete(assetId);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Asset removido dos favoritos' 
    });
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return NextResponse.json(
      { error: 'Falha ao remover dos favoritos' },
      { status: 500 }
    );
  }
}
