// ============================================================================
// TYPES
// ============================================================================

export interface DeviceOrientation {
  alpha: number | null;  // Z-axis rotation [0, 360)
  beta: number | null;   // X-axis rotation [-180, 180)
  gamma: number | null;  // Y-axis rotation [-90, 90)
}

export interface CineLinkState {
  isConnected: boolean;
  isStreaming: boolean;
  deviceId: string | null;
  lastOrientation: DeviceOrientation;
  latency: number;
  batteryLevel: number | null;
}

export interface CineLinkSettings {
  smoothing: number;        // 0-1, quanto suavizar os movimentos
  sensitivity: number;      // Multiplicador de sensibilidade
  invertX: boolean;
  invertY: boolean;
  deadzone: number;         // Zona morta para ignorar micro-movimentos
  updateRate: number;       // Hz update rate
}

export interface CineLinkMessage {
  type: 'CAM_MOVE' | 'CAM_CONNECT' | 'CAM_DISCONNECT' | 'CAM_BATTERY' | 'CAM_PING';
  deviceId?: string;
  rotation?: DeviceOrientation;
  battery?: number;
  timestamp?: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SETTINGS: CineLinkSettings = {
  smoothing: 0.7,
  sensitivity: 1.0,
  invertX: false,
  invertY: false,
  deadzone: 0.5,
  updateRate: 60,
};

export const DEFAULT_STATE: CineLinkState = {
  isConnected: false,
  isStreaming: false,
  deviceId: null,
  lastOrientation: { alpha: 0, beta: 0, gamma: 0 },
  latency: 0,
  batteryLevel: null,
};
