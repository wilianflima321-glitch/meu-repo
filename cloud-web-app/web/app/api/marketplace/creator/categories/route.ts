/**
 * AETHEL ENGINE - Marketplace Creator Categories API
 * 
 * Retorna a distribuição de vendas por categoria para o dashboard do criador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

interface CategoryData {
  name: string;
  value: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // TODO: Buscar dados reais do banco de dados
    // Por enquanto retorna array vazio para novos criadores
    // Quando houver vendas, isso será populado automaticamente
    
    const categories: CategoryData[] = [];
    
    // Em produção, seria algo assim:
    // const categories = await db.sales.groupBy({
    //   by: ['category'],
    //   where: { creatorId: session.user.id },
    //   _sum: { amount: true },
    //   _count: true,
    // });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar dados de categorias' },
      { status: 500 }
    );
  }
}
