import { NextRequest, NextResponse } from 'next/server';
import aethelMCPServer from '@/lib/mcp/aethel-mcp-server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

/**
 * Aethel MCP HTTP API
 * 
 * Endpoint HTTP para comunicação com o MCP Server do Aethel IDE.
 * Suporta todas as operações do protocolo MCP via JSON-RPC.
 * 
 * SECURITY: Autenticação obrigatória - MCP expõe ferramentas internas.
 */

export async function POST(req: NextRequest) {
  try {
    // CRÍTICO: Autenticação obrigatória para acesso ao MCP
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'mcp-post',
      key: auth.userId,
      max: 300,
      windowMs: 60 * 60 * 1000,
      message: 'Too many MCP requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    const message = await req.json();
    
    if (!message.jsonrpc || message.jsonrpc !== '2.0') {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid JSON-RPC request' },
        id: message.id || null,
      }, { status: 400 });
    }
    
    // Passa contexto do usuário autenticado para o MCP Server
    const response = await aethelMCPServer.handleMessage({
      ...message,
      context: {
        userId: auth.userId,
        requestId: req.headers.get('x-request-id') || undefined,
      },
    } as any);
    
    return NextResponse.json(response);
  } catch (error) {
    // Trata erros de autenticação primeiro
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    console.error('MCP API Error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined,
      },
      id: null,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit({
    scope: 'mcp-get',
    key: getRequestIp(req),
    max: 180,
    windowMs: 60 * 60 * 1000,
    message: 'Too many MCP status requests. Please wait before retrying.',
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Informações públicas básicas do servidor MCP (sem detalhes de capabilities)
  // Detalhes completos requerem autenticação via POST
  return NextResponse.json({
    name: 'Aethel MCP Server',
    version: '1.0.0',
    protocol: 'mcp',
    protocolVersion: '2024-11-05',
    status: 'running',
    documentation: 'https://docs.aethel.io/mcp',
    // Capabilities detalhadas removidas do GET público por segurança
  });
}
