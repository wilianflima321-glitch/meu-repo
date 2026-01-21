/**
 * AETHEL ENGINE - Marketplace Creator Recent Sales API
 * 
 * Retorna as vendas recentes para o dashboard do criador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

interface RecentSale {
  id: string;
  assetName: string;
  buyerName: string;
  amount: number;
  date: string;
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

    // TODO: Buscar vendas reais do banco de dados
    // Por enquanto retorna array vazio para novos criadores
    // Quando houver vendas, isso será populado automaticamente
    
    const sales: RecentSale[] = [];
    
    // Em produção, seria algo assim:
    // const sales = await db.sales.findMany({
    //   where: { creatorId: session.user.id },
    //   orderBy: { createdAt: 'desc' },
    //   take: 10,
    //   include: {
    //     asset: { select: { name: true } },
    //     buyer: { select: { name: true } },
    //   },
    // });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Erro ao buscar vendas recentes:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar vendas recentes' },
      { status: 500 }
    );
  }
}
