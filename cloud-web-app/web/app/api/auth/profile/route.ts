import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback';
// Block 6E: encryptString removed — never persist BYOK on profile

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
        byokSet: false,
        byokStorage: 'client_indexeddb',
        byokSetupUrl: '/settings?tab=byok',
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
            byokSet: false,
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

    if (body?.byokKey !== undefined) {
      return NextResponse.json(
        {
          error: 'BYOK_SERVER_VAULT_RETIRED',
          message:
            'BYOK keys are client-only (IndexedDB aethel-byok-v1). Configure keys in Settings → BYOK.',
          setupUrl: '/settings?tab=byok',
          capability: 'BYOK',
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 410 },
      );
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const avatar = typeof body?.avatar === 'string' ? body.avatar.trim() : undefined;
    const language = typeof body?.language === 'string' ? body.language.trim() : undefined;
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : undefined;
    const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : undefined;
    const notifications = typeof body?.notifications === 'object' && body?.notifications ? body.notifications : undefined;

    if (name !== undefined || avatar !== undefined) {
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
        role: true,
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
        byokSet: false,
        byokStorage: 'client_indexeddb',
        byokSetupUrl: '/settings?tab=byok',
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
