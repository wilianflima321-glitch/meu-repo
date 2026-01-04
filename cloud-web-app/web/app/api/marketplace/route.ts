import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { getMarketplaceRuntime } from '@/lib/server/marketplace-runtime';

/**
 * GET /api/marketplace - Search/Get Extensions
 * 
 * Query params:
 * - action: 'search' | 'details' | 'versions' | 'installed' | 'updates'
 * - query: string (for search)
 * - id: string (extension ID for details/versions)
 * - category: string (optional)
 * - sortBy: 'relevance' | 'downloads' | 'rating' | 'updated'
 * - pageSize: number
 * - pageNumber: number
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireFeatureForUser(user.userId, 'extensions');

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'search';
    
    const marketplace = getMarketplaceRuntime();

    switch (action) {
      case 'search': {
        const query = searchParams.get('query') || '';
        const category = searchParams.get('category') || undefined;
        const sortBy = (searchParams.get('sortBy') as any) || 'relevance';
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const pageNumber = parseInt(searchParams.get('pageNumber') || '1', 10);

        const result = await marketplace.search(query, {
          category,
          sortBy,
          pageSize,
          pageNumber,
        });

        return NextResponse.json(result);
      }

      case 'details': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { error: 'Extension ID is required' },
            { status: 400 }
          );
        }

        const details = await marketplace.getExtensionDetails(id);
        
        if (!details) {
          return NextResponse.json(
            { error: 'Extension not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(details);
      }

      case 'versions': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { error: 'Extension ID is required' },
            { status: 400 }
          );
        }

        const versions = await marketplace.getExtensionVersions(id);
        return NextResponse.json(versions);
      }

      case 'installed': {
        const extensions = marketplace.getInstalledExtensions();
        return NextResponse.json({ extensions });
      }

      case 'updates': {
        const updates = await marketplace.checkForUpdates();
        return NextResponse.json({ updates });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Marketplace request failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: 'Request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace - Install/Manage Extensions
 * 
 * Body:
 * - action: 'install' | 'uninstall' | 'update' | 'enable' | 'disable'
 * - id: string (extension ID)
 * - version: string (optional, for install/update)
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireFeatureForUser(user.userId, 'extensions');

    const body = await request.json();
    const { action, id, version } = body;

    if (!action || !id) {
      return NextResponse.json(
        { error: 'action and id are required' },
        { status: 400 }
      );
    }

    const marketplace = getMarketplaceRuntime();

    switch (action) {
      case 'install': {
        const result = await marketplace.install(id, version);
        
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          extension: result.extension,
        });
      }

      case 'uninstall': {
        const success = await marketplace.uninstall(id);
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Failed to uninstall extension' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'update': {
        const result = await marketplace.update(id, version);
        
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          extension: result.extension,
        });
      }

      case 'enable': {
        const success = await marketplace.setEnabled(id, true);
        return NextResponse.json({ success });
      }

      case 'disable': {
        const success = await marketplace.setEnabled(id, false);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Marketplace operation failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: 'Operation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
