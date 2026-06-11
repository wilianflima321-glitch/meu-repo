import type { AethelAction, AethelState, WalletState } from './aethel-provider.contracts';

export function aethelReducer(state: AethelState, action: AethelAction): AethelState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_WALLET':
      return {
        ...state,
        wallet: state.wallet
          ? { ...state.wallet, ...action.payload }
          : action.payload as WalletState,
      };
    case 'START_AI_SESSION':
      return {
        ...state,
        aiSession: {
          id: action.payload.id,
          status: 'thinking',
          prompt: action.payload.prompt,
          steps: [],
          startTime: Date.now(),
        },
      };
    case 'ADD_AI_STEP':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          steps: [...state.aiSession.steps, action.payload],
        },
      };
    case 'UPDATE_AI_STEP':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          steps: state.aiSession.steps.map(step =>
            step.id === action.payload.stepId
              ? { ...step, ...action.payload.updates }
              : step
          ),
        },
      };
    case 'COMPLETE_AI_SESSION':
      return {
        ...state,
        aiSession: {
          ...state.aiSession,
          status: 'complete',
          endTime: Date.now(),
        },
      };
    case 'UPDATE_ONBOARDING':
      return {
        ...state,
        onboarding: { ...state.onboarding, ...action.payload },
      };
    case 'SET_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}
