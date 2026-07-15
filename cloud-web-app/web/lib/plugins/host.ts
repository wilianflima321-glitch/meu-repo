import { prisma } from '../db';
import { createComponentLogger } from '../observability/logger';

const log = createComponentLogger('lib.plugins.host');

export async function listInstalledPlugins(userId: string) {
  try {
    const installs = await prisma.pluginInstall.findMany({
      where: { userId },
      orderBy: { installedAt: 'desc' },
    });
    return installs;
  } catch (error) {
    log.error('Failed to list plugins', error);
    return [];
  }
}

export async function installPlugin(userId: string, pluginId: string, version: string = 'latest') {
  try {
    const install = await prisma.pluginInstall.upsert({
      where: {
        userId_pluginId: {
          userId,
          pluginId,
        }
      },
      update: {
        version,
        updatedAt: new Date(),
      },
      create: {
        userId,
        pluginId,
        version,
        status: 'active',
        config: {},
      }
    });
    return install;
  } catch (error) {
    log.error(`Failed to install plugin ${pluginId}`, error);
    throw error;
  }
}

export async function uninstallPlugin(userId: string, pluginId: string) {
  try {
    await prisma.pluginInstall.delete({
      where: {
        userId_pluginId: {
          userId,
          pluginId,
        }
      }
    });
    return true;
  } catch (error) {
    log.error(`Failed to uninstall plugin ${pluginId}`, error);
    // Might not exist, which is fine for uninstall
    return false;
  }
}
