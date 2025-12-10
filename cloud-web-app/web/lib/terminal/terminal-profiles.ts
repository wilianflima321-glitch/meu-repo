/**
 * Terminal Profiles
 * Manages terminal profiles and persistence
 */

export interface TerminalProfile {
  id: string;
  name: string;
  shellPath: string;
  shellArgs?: string[];
  env?: Record<string, string>;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}

export interface TerminalSession {
  id: string;
  name: string;
  profileId: string;
  cwd: string;
  buffer: string[];
  scrollback: number;
  createdAt: number;
  lastUsed: number;
}

export class TerminalProfileManager {
  private profiles: Map<string, TerminalProfile> = new Map();
  private sessions: Map<string, TerminalSession> = new Map();
  private readonly STORAGE_KEY_PROFILES = 'terminal-profiles';
  private readonly STORAGE_KEY_SESSIONS = 'terminal-sessions';
  private readonly MAX_BUFFER_SIZE = 10000;

  constructor() {
    this.loadProfiles();
    this.loadSessions();
    this.initializeDefaultProfiles();
  }

  /**
   * Initialize default profiles
   */
  private initializeDefaultProfiles(): void {
    if (this.profiles.size === 0) {
      // Bash profile
      this.addProfile({
        id: 'bash',
        name: 'Bash',
        shellPath: '/bin/bash',
        shellArgs: ['--login'],
        icon: '🐚',
        color: '#4EAA25',
        isDefault: true,
      });

      // Zsh profile
      this.addProfile({
        id: 'zsh',
        name: 'Zsh',
        shellPath: '/bin/zsh',
        shellArgs: ['--login'],
        icon: '⚡',
        color: '#89E051',
      });

      // Fish profile
      this.addProfile({
        id: 'fish',
        name: 'Fish',
        shellPath: '/usr/bin/fish',
        icon: '🐟',
        color: '#00D0D0',
      });

      // PowerShell profile
      this.addProfile({
        id: 'powershell',
        name: 'PowerShell',
        shellPath: 'pwsh',
        icon: '⚙️',
        color: '#012456',
      });

      // Node.js profile
      this.addProfile({
        id: 'node',
        name: 'Node.js',
        shellPath: 'node',
        icon: '📗',
        color: '#68A063',
      });

      // Python profile
      this.addProfile({
        id: 'python',
        name: 'Python',
        shellPath: 'python3',
        shellArgs: ['-i'],
        icon: '🐍',
        color: '#3776AB',
      });
    }
  }

  /**
   * Add profile
   */
  addProfile(profile: TerminalProfile): void {
    this.profiles.set(profile.id, profile);
    this.saveProfiles();
    console.log(`[Terminal Profiles] Added profile: ${profile.name}`);
  }

  /**
   * Remove profile
   */
  removeProfile(profileId: string): void {
    this.profiles.delete(profileId);
    this.saveProfiles();
    console.log(`[Terminal Profiles] Removed profile: ${profileId}`);
  }

  /**
   * Update profile
   */
  updateProfile(profileId: string, updates: Partial<TerminalProfile>): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      this.profiles.set(profileId, { ...profile, ...updates });
      this.saveProfiles();
      console.log(`[Terminal Profiles] Updated profile: ${profileId}`);
    }
  }

  /**
   * Get profile
   */
  getProfile(profileId: string): TerminalProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): TerminalProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get default profile
   */
  getDefaultProfile(): TerminalProfile | undefined {
    return Array.from(this.profiles.values()).find(p => p.isDefault);
  }

  /**
   * Set default profile
   */
  setDefaultProfile(profileId: string): void {
    // Remove default from all profiles
    this.profiles.forEach(profile => {
      profile.isDefault = false;
    });

    // Set new default
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.isDefault = true;
      this.saveProfiles();
      console.log(`[Terminal Profiles] Set default profile: ${profileId}`);
    }
  }

  /**
   * Create session
   */
  createSession(
    name: string,
    profileId: string,
    cwd: string
  ): TerminalSession {
    const session: TerminalSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      profileId,
      cwd,
      buffer: [],
      scrollback: 1000,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.saveSessions();
    console.log(`[Terminal Profiles] Created session: ${session.id}`);

    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<TerminalSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates, lastUsed: Date.now() });
      this.saveSessions();
    }
  }

  /**
   * Append to session buffer
   */
  appendToBuffer(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.buffer.push(data);
      
      // Trim buffer if too large
      if (session.buffer.length > this.MAX_BUFFER_SIZE) {
        session.buffer = session.buffer.slice(-session.scrollback);
      }

      session.lastUsed = Date.now();
      this.saveSessions();
    }
  }

  /**
   * Clear session buffer
   */
  clearBuffer(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.buffer = [];
      this.saveSessions();
    }
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.saveSessions();
    console.log(`[Terminal Profiles] Closed session: ${sessionId}`);
  }

  /**
   * Restore sessions
   * Called on startup to restore previous terminal sessions
   */
  restoreSessions(): TerminalSession[] {
    const sessions = this.getAllSessions();
    console.log(`[Terminal Profiles] Restoring ${sessions.length} sessions`);
    return sessions;
  }

  /**
   * Clean old sessions
   * Remove sessions older than specified days
   */
  cleanOldSessions(daysOld: number = 7): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    this.sessions.forEach((session, id) => {
      if (session.lastUsed < cutoff) {
        this.sessions.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.saveSessions();
      console.log(`[Terminal Profiles] Cleaned ${cleaned} old sessions`);
    }
  }

  /**
   * Export profiles
   */
  exportProfiles(): string {
    const profiles = Array.from(this.profiles.values());
    return JSON.stringify(profiles, null, 2);
  }

  /**
   * Import profiles
   */
  importProfiles(json: string): void {
    try {
      const profiles = JSON.parse(json) as TerminalProfile[];
      profiles.forEach(profile => {
        this.profiles.set(profile.id, profile);
      });
      this.saveProfiles();
      console.log(`[Terminal Profiles] Imported ${profiles.length} profiles`);
    } catch (error) {
      console.error('[Terminal Profiles] Failed to import profiles:', error);
      throw error;
    }
  }

  /**
   * Load profiles from storage
   */
  private loadProfiles(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PROFILES);
      if (stored) {
        const profiles = JSON.parse(stored) as TerminalProfile[];
        profiles.forEach(profile => {
          this.profiles.set(profile.id, profile);
        });
        console.log(`[Terminal Profiles] Loaded ${profiles.length} profiles`);
      }
    } catch (error) {
      console.error('[Terminal Profiles] Failed to load profiles:', error);
    }
  }

  /**
   * Save profiles to storage
   */
  private saveProfiles(): void {
    try {
      const profiles = Array.from(this.profiles.values());
      localStorage.setItem(this.STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (error) {
      console.error('[Terminal Profiles] Failed to save profiles:', error);
    }
  }

  /**
   * Load sessions from storage
   */
  private loadSessions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_SESSIONS);
      if (stored) {
        const sessions = JSON.parse(stored) as TerminalSession[];
        sessions.forEach(session => {
          this.sessions.set(session.id, session);
        });
        console.log(`[Terminal Profiles] Loaded ${sessions.length} sessions`);
      }
    } catch (error) {
      console.error('[Terminal Profiles] Failed to load sessions:', error);
    }
  }

  /**
   * Save sessions to storage
   */
  private saveSessions(): void {
    try {
      const sessions = Array.from(this.sessions.values());
      localStorage.setItem(this.STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('[Terminal Profiles] Failed to save sessions:', error);
    }
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    totalProfiles: number;
    oldestSession: number | null;
    newestSession: number | null;
  } {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.lastUsed > oneHourAgo).length,
      totalProfiles: this.profiles.size,
      oldestSession: sessions.length > 0 
        ? Math.min(...sessions.map(s => s.createdAt))
        : null,
      newestSession: sessions.length > 0
        ? Math.max(...sessions.map(s => s.createdAt))
        : null,
    };
  }
}

// Singleton instance
let terminalProfileManagerInstance: TerminalProfileManager | null = null;

export function getTerminalProfileManager(): TerminalProfileManager {
  if (!terminalProfileManagerInstance) {
    terminalProfileManagerInstance = new TerminalProfileManager();
  }
  return terminalProfileManagerInstance;
}
