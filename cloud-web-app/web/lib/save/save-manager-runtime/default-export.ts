/**
 * Save Manager - split persistence runtime.
 *
 * Save serialization, validation, cloud sync, and React hooks are separated so
 * Studio can lazy-load persistence features without bloating initial shells.
 */

import { SaveManager } from './manager';
import { SaveMigrator } from './migration';
import { usePlayTime, useSaveManager, useSaveOperations, useSaveSlots, useSaveStatus, SaveProvider } from './react';
import { CompressedSerializer, JSONSerializer } from './serializers';
import { SaveValidator } from './validator';

const __defaultExport = {
  SaveManager,
  JSONSerializer,
  CompressedSerializer,
  SaveMigrator,
  SaveValidator,
  SaveProvider,
  useSaveManager,
  useSaveSlots,
  useSaveStatus,
  useSaveOperations,
  usePlayTime,
};

export default __defaultExport;
