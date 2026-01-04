import { NextRequest, NextResponse } from 'next/server';
import aethelMCPServer from '@/lib/mcp/aethel-mcp-server';

/**
 * Aethel MCP HTTP API
 * 
 * Endpoint HTTP para comunicação com o MCP Server do Aethel IDE.
 * Suporta todas as operações do protocolo MCP via JSON-RPC.
 */

export async function POST(req: NextRequest) {
  try {
    const message = await req.json();
    
    if (!message.jsonrpc || message.jsonrpc !== '2.0') {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid JSON-RPC request' },
        id: message.id || null,
      }, { status: 400 });
    }
    
    const response = await aethelMCPServer.handleMessage(message);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('MCP API Error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
      id: null,
    }, { status: 500 });
  }
}

export async function GET() {
  // Retorna informações do servidor MCP
  return NextResponse.json({
    name: 'Aethel MCP Server',
    version: '1.0.0',
    protocol: 'mcp',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
      sampling: false,
    },
    status: 'running',
    endpoints: {
      http: '/api/mcp',
      websocket: '/api/mcp/ws',
    },
  });
}
