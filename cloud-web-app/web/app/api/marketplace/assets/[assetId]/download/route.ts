/**
 * AETHEL ENGINE - Marketplace Asset Download API
 * 
 * REAL endpoint para download de assets do marketplace.
 * Gera URL assinada do S3 para download seguro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/storage-service';
import { getUserFromRequest } from '@/lib/auth-server';

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { assetId } = await params;
    
    // Autenticação
    const user = getUserFromRequest(request);
    if (!user?.userId) {
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // Buscar asset
    const asset = await prisma.marketplaceItem.findUnique({
      where: { id: assetId },
    });
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se asset está publicado e aprovado
    if (!asset.isPublished || !asset.isApproved) {
      // Apenas o autor pode baixar assets não publicados
      if (asset.authorId !== user.userId) {
        return NextResponse.json(
          { error: 'Asset não disponível' },
          { status: 403 }
        );
      }
    }
    
    // Verificar se tem arquivo
    if (!asset.storagePath) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se é gratuito ou se o usuário comprou
    if (asset.price > 0) {
      // TODO: Implementar verificação de compra
      // Por enquanto, permitimos download se o usuário é o autor
      if (asset.authorId !== user.userId) {
        // Verificar compra (será implementado com sistema de pagamentos)
        const hasPurchased = await prisma.$queryRaw`
          SELECT 1 FROM "Purchase" 
          WHERE "userId" = ${user.userId} 
          AND "assetId" = ${assetId}
          LIMIT 1
        `;
        
        if (!hasPurchased || (hasPurchased as any[]).length === 0) {
          return NextResponse.json(
            { error: 'Compra necessária para download' },
            { status: 402 }
          );
        }
      }
    }
    
    // Gerar URL assinada para download (expira em 1 hora)
    const downloadUrl = await getSignedDownloadUrl('ASSETS', asset.storagePath, 3600);
    
    // Incrementar contador de downloads
    await prisma.marketplaceItem.update({
      where: { id: assetId },
      data: { downloads: { increment: 1 } },
    });
    
    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresIn: 3600,
      asset: {
        id: asset.id,
        title: asset.title,
        version: asset.version,
        fileSize: asset.fileSize,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar download:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar link de download' },
      { status: 500 }
    );
  }
}
