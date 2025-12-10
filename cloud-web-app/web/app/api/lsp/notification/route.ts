import { NextRequest, NextResponse } from 'next/server';

interface LSPNotification {
  language: string;
  method: string;
  params: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: LSPNotification = await request.json();
    const { language, method, params } = body;

    if (!language || !method) {
      return NextResponse.json(
        { error: 'Language and method are required' },
        { status: 400 }
      );
    }

    console.log(`LSP Notification [${language}]: ${method}`);

    // Handle notifications (no response expected)
    await handleLSPNotification(language, method, params);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LSP notification failed:', error);
    return NextResponse.json(
      { error: 'Notification failed' },
      { status: 500 }
    );
  }
}

async function handleLSPNotification(language: string, method: string, params: any): Promise<void> {
  switch (method) {
    case 'initialized':
      console.log(`LSP server initialized for ${language}`);
      break;

    case 'textDocument/didOpen':
      console.log(`Document opened: ${params.textDocument.uri}`);
      break;

    case 'textDocument/didChange':
      console.log(`Document changed: ${params.textDocument.uri}`);
      break;

    case 'textDocument/didClose':
      console.log(`Document closed: ${params.textDocument.uri}`);
      break;

    case 'textDocument/didSave':
      console.log(`Document saved: ${params.textDocument.uri}`);
      break;

    case 'exit':
      console.log(`LSP server exiting for ${language}`);
      break;

    default:
      console.warn(`Unhandled LSP notification: ${method}`);
  }
}
