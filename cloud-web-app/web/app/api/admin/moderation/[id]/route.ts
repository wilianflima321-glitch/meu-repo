import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, logAdminAction, applyShadowBan, AdminUser } from '@/lib/rbac';

// =============================================================================
// MODERATION ACTION API
// =============================================================================

async function actionHandler(
  req: NextRequest,
  { user }: { user: AdminUser }
) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() || '';
  const body = await req.json();
  const { action, notes } = body;
  
  const adminId = user.id;
  const adminEmail = user.email || 'unknown';
  
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the moderation item
    const item = await prisma.moderationItem.findUnique({
      where: { id },
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    // Process action
    let newStatus: string = item.status;
    let resolution: string = '';
    
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        resolution = 'Content approved - no violation found';
        break;
        
      case 'reject':
        newStatus = 'rejected';
        resolution = 'Content rejected - policy violation confirmed';
        
        // Delete the target content if applicable
        if (item.targetType === 'project' && item.targetId) {
          // Mark project as deleted/hidden instead of hard delete
          await prisma.project.update({
            where: { id: item.targetId },
            data: { 
              // You might add a 'status' or 'isDeleted' field
              updatedAt: new Date(), // Just update for now
            },
          }).catch(() => null); // Ignore if not found
        }
        break;
        
      case 'escalate':
        newStatus = 'escalated';
        resolution = 'Escalated to senior moderator';
        
        // Update priority to urgent
        await prisma.moderationItem.update({
          where: { id },
          data: { priority: 'urgent' },
        });
        break;
        
      case 'shadowban':
        if (item.targetOwnerId) {
          await applyShadowBan(
            item.targetOwnerId,
            adminId,
            `Moderation action: ${item.reason || 'Policy violation'}`
          );
          
          newStatus = 'rejected';
          resolution = 'User shadow banned';
          
          // Log the shadow ban
          await logAdminAction({
            action: 'shadow_ban',
            actorId: adminId,
            actorEmail: adminEmail,
            targetType: 'user',
            targetId: item.targetOwnerId,
            details: { reason: `Via moderation item ${id}: ${item.reason}`, moderationItemId: id },
            timestamp: new Date(),
          });
        } else {
          return NextResponse.json(
            { error: 'No target user to shadow ban' },
            { status: 400 }
          );
        }
        break;
        
      case 'delete':
        newStatus = 'rejected';
        resolution = 'Content permanently deleted';
        
        // Hard delete based on target type
        if (item.targetType === 'project' && item.targetId) {
          await prisma.project.delete({
            where: { id: item.targetId },
          }).catch(() => null);
        } else if (item.targetType === 'asset' && item.targetId) {
          await prisma.asset.delete({
            where: { id: item.targetId },
          }).catch(() => null);
        }
        break;
        
      case 'skip':
        // Don't change status, just move to next
        return NextResponse.json({ success: true, skipped: true });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Update the moderation item
    await prisma.moderationItem.update({
      where: { id },
      data: {
        status: newStatus,
        resolution,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        notes: notes || item.notes,
      },
    });
    
    // Log the moderation action
    await logAdminAction({
      action: `moderation_${action}`,
      actorId: adminId,
      actorEmail: adminEmail,
      targetType: item.targetType,
      targetId: item.targetId,
      details: {
        resolution,
        severity: action === 'shadowban' || action === 'delete' ? 'warning' : 'info',
        moderationItemId: id,
        originalReason: item.reason,
        originalCategory: item.category,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      action,
      status: newStatus,
      resolution,
    });
    
  } catch (error) {
    console.error('[Moderation Action] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process moderation action' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(actionHandler, 'ops:moderation:ban');
