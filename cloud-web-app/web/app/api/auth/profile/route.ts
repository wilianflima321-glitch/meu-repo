import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-profile-read',
      key: authUser.userId,
      max: 180,
      windowMs: 60 * 1000,
      message: 'Too many profile read requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        createdAt: true,
        emailVerified: true,
        mfaEnabled: true,
        twoFactorEnabled: true,
        // Em alguns schemas, role existe; manter compatibilidade.
        role: true as any,
        userPreferences: {
          select: {
            language: true,
            emailNotifications: true,
            chatNotifications: true,
            preferences: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const prefs = (user.userPreferences?.preferences as Record<string, unknown>) || {};

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatar: user.avatar ?? undefined,
        plan: user.plan ?? undefined,
        createdAt: user.createdAt?.toISOString?.() ?? undefined,
        emailVerified: user.emailVerified ?? false,
        mfaEnabled: user.mfaEnabled ?? false,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        language: user.userPreferences?.language ?? 'pt-BR',
        theme: (prefs.theme as string) || undefined,
        timezone: (prefs.timezone as string) || undefined,
        notifications: {
          email: user.userPreferences?.emailNotifications ?? true,
          push: user.userPreferences?.chatNotifications ?? false,
          marketing: (prefs.marketing as boolean) ?? false,
        },
        role: (user as any).role ?? undefined,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);

		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-profile-update',
      key: authUser.userId,
      max: 45,
      windowMs: 60 * 1000,
      message: 'Too many profile update requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json().catch(() => ({}));

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const avatar = typeof body?.avatar === 'string' ? body.avatar.trim() : undefined;
    const language = typeof body?.language === 'string' ? body.language.trim() : undefined;
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : undefined;
    const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : undefined;
    const notifications = typeof body?.notifications === 'object' && body?.notifications ? body.notifications : undefined;

    if (name || avatar) {
      await prisma.user.update({
        where: { id: authUser.userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
        },
      });
    }

    const shouldUpdatePrefs = Boolean(language || theme || timezone || notifications);
    if (shouldUpdatePrefs) {
      const existing = await prisma.userPreferences.findUnique({
        where: { userId: authUser.userId },
        select: { preferences: true },
      });

      const basePreferences = (existing?.preferences && typeof existing.preferences === 'object')
        ? (existing.preferences as Record<string, unknown>)
        : {};
      const mergedPreferences = {
        ...basePreferences,
        ...(theme ? { theme } : {}),
        ...(timezone ? { timezone } : {}),
        ...(typeof notifications?.marketing === 'boolean' ? { marketing: notifications.marketing } : {}),
      };

      await prisma.userPreferences.upsert({
        where: { userId: authUser.userId },
        create: {
          userId: authUser.userId,
          language: language || 'pt-BR',
          emailNotifications: typeof notifications?.email === 'boolean' ? notifications.email : true,
          chatNotifications: typeof notifications?.push === 'boolean' ? notifications.push : true,
          preferences: mergedPreferences,
        },
        update: {
          ...(language ? { language } : {}),
          ...(typeof notifications?.email === 'boolean' ? { emailNotifications: notifications.email } : {}),
          ...(typeof notifications?.push === 'boolean' ? { chatNotifications: notifications.push } : {}),
          preferences: mergedPreferences,
        },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        createdAt: true,
        emailVerified: true,
        mfaEnabled: true,
        twoFactorEnabled: true,
        role: true as any,
        userPreferences: {
          select: {
            language: true,
            emailNotifications: true,
            chatNotifications: true,
            preferences: true,
          },
        },
      },
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const prefs = (updated.userPreferences?.preferences as Record<string, unknown>) || {};

    return NextResponse.json({
      profile: {
        id: updated.id,
        email: updated.email,
        name: updated.name ?? undefined,
        avatar: updated.avatar ?? undefined,
        plan: updated.plan ?? undefined,
        createdAt: updated.createdAt?.toISOString?.() ?? undefined,
        emailVerified: updated.emailVerified ?? false,
        mfaEnabled: updated.mfaEnabled ?? false,
        twoFactorEnabled: updated.twoFactorEnabled ?? false,
        language: updated.userPreferences?.language ?? 'pt-BR',
        theme: (prefs.theme as string) || undefined,
        timezone: (prefs.timezone as string) || undefined,
        notifications: {
          email: updated.userPreferences?.emailNotifications ?? true,
          push: updated.userPreferences?.chatNotifications ?? false,
          marketing: (prefs.marketing as boolean) ?? false,
        },
        role: (updated as any).role ?? undefined,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
