import { NextRequest, NextResponse } from 'next/server';

interface UninstallRequest {
  extensionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UninstallRequest = await request.json();
    const { extensionId } = body;

    if (!extensionId) {
      return NextResponse.json(
        { success: false, error: 'Extension ID is required' },
        { status: 400 }
      );
    }

    console.log(`Uninstalling extension: ${extensionId}`);

    // Simulate uninstallation process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove installation from database or file system
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: `Extension ${extensionId} uninstalled successfully`,
      extensionId,
      uninstalledAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Extension uninstallation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Uninstallation failed' },
      { status: 500 }
    );
  }
}
