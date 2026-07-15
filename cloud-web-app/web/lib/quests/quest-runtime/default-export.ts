/**
 * Quest System - split gameplay runtime.
 *
 * Quest authoring, runtime state, and React bindings are separated so Studio
 * can lazy-load gameplay systems without pulling the whole subsystem at once.
 */

import { QuestBuilder } from './builder';
import { QuestManager } from './manager';
import { QuestProvider, useQuestProgress, useQuests } from './react';

const __defaultExport = {
  QuestManager,
  QuestBuilder,
  QuestProvider,
  useQuests,
  useQuestProgress,
};

export default __defaultExport;
