import { CutsceneSystem } from './cutscene-system';
import { DialogueSystem } from './dialogue-system';
import { CinematicBarsRenderer, DialogueUIRenderer, SubtitleRenderer } from './renderers';

export const createDialogueSystem = (): DialogueSystem => {
  return new DialogueSystem();
};

export const createCutsceneSystem = (): CutsceneSystem => {
  return new CutsceneSystem();
};

export const createDialogueUI = (containerId: string): DialogueUIRenderer => {
  return new DialogueUIRenderer(containerId);
};

export const createSubtitleRenderer = (containerId?: string): SubtitleRenderer => {
  return new SubtitleRenderer(containerId);
};

export const createCinematicBars = (): CinematicBarsRenderer => {
  return new CinematicBarsRenderer();
};
