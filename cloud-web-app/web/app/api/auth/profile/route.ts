import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback';
import { encryptString } from '@/lib/server/crypto';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api.auth.profile');

export async function GET(req: NextRequest) {
  let authUser: ReturnType<typeof requireAuth> | null = null;
  try {
    authUser = requireAuth(req);

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
        role: true,
        byokKey: true,
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
        byokSet: !!user.byokKey,
        notifications: {
          email: user.userPreferences?.emailNotifications ?? true,
          push: user.userPreferences?.chatNotifications ?? false,
          marketing: (prefs.marketing as boolean) ?? false,
        },
        role: user.role ?? undefined,
      },
    });
  } catch (error) {
    routeLogger.error('Profile error', error);

    if (authUser && shouldUseLocalEvidenceFallback(req, error)) {
      return localEvidenceJson(
        req,
        error,
        {
          profile: {
            id: authUser.userId,
            email: authUser.email,
            name: 'Aethel Visual QA',
            avatar: undefined,
            plan: authUser.plan ?? 'studio',
            createdAt: undefined,
            emailVerified: true,
            mfaEnabled: false,
            twoFactorEnabled: false,
            language: 'en',
            theme: 'dark',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: false,
              marketing: false,
            },
            role: authUser.role ?? 'admin',
          },
        },
        { surface: 'auth.profile', state: 'held' },
      );
    }

		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const avatar = typeof body?.avatar === 'string' ? body.avatar.trim() : undefined;
    const language = typeof body?.language === 'string' ? body.language.trim() : undefined;
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : undefined;
    const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : undefined;
    const notifications = typeof body?.notifications === 'object' && body?.notifications ? body.notifications : undefined;

    const byokKey = body?.byokKey !== undefined ? body.byokKey : undefined;

    if (name !== undefined || avatar !== undefined || byokKey !== undefined) {
      const encryptedKey = (typeof byokKey === 'string' && byokKey.trim().length > 0)
        ? encryptString(byokKey.trim())
        : (byokKey === null || (typeof byokKey === 'string' && byokKey.trim().length === 0)) ? null : undefined;

      await prisma.user.update({
        where: { id: authUser.userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(encryptedKey !== undefined ? { byokKey: encryptedKey } : {}),
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
        role: true,
        byokKey: true,
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
        byokSet: !!updated.byokKey,
        notifications: {
          email: updated.userPreferences?.emailNotifications ?? true,
          push: updated.userPreferences?.chatNotifications ?? false,
          marketing: (prefs.marketing as boolean) ?? false,
        },
        role: updated.role ?? undefined,
      },
    });
  } catch (error) {
    routeLogger.error('Profile update error', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
