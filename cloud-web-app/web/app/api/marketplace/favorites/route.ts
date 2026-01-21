/**
 * AETHEL ENGINE - Marketplace Favorites API
 * 
 * Gerencia favoritos do usuário no marketplace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock de dados - Substituir por banco de dados real
const userFavorites: Record<string, Set<string>> = {};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    const favorites = userFavorites[userId] 
      ? Array.from(userFavorites[userId]) 
      : [];

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar favoritos' },
      { status: 500 }
    );
  }
}
