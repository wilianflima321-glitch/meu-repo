/**
 * Replay System - composition layer.
 */

import { InputSerializer } from './replay-input-serializer';
import { StateSerializer } from './replay-state-serializer';
import { ReplayManager } from './replay-manager';
import {
  ReplayProvider,
  useReplayManager,
  useReplayPlayer,
  useReplayRecordings,
  useReplayRecorder,
} from './replay-hooks';
import { ReplayPlayer, ReplayRecorder } from './replay-runtime';

export type {
  EntitySnapshot,
  InputState,
  PlaybackState,
  PlayerInfo,
  Recording,
  RecordingMetadata,
  ReplayConfig,
  ReplayEvent,
  ReplayFrame,
  StateSnapshot,
} from './replay-types';

export { InputSerializer } from './replay-input-serializer';
export { StateSerializer } from './replay-state-serializer';
export { ReplayManager } from './replay-manager';
export {
  ReplayProvider,
  useReplayManager,
  useReplayPlayer,
  useReplayRecordings,
  useReplayRecorder,
} from './replay-hooks';
export { ReplayPlayer, ReplayRecorder } from './replay-runtime';

const __defaultExport = {
  ReplayRecorder,
  ReplayPlayer,
  ReplayManager,
  InputSerializer,
  StateSerializer,
  ReplayProvider,
  useReplayManager,
  useReplayRecorder,
  useReplayPlayer,
  useReplayRecordings,
};

export default __defaultExport;
