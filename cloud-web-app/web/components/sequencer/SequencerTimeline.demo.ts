import type { SequenceData } from "./SequencerTimeline.types";

// ============================================================================
// DEMO DATA
// ============================================================================

export const DEMO_SEQUENCE: SequenceData = {
  id: "seq-1",
  name: "Opening Cinematic",
  duration: 30,
  frameRate: 30,
  groups: [
    {
      id: "grp-camera",
      name: "Camera",
      tracks: [
        {
          id: "trk-cam-pos",
          name: "Main Camera",
          type: "camera",
          targetId: "camera-main",
          property: "position",
          keyframes: [
            { id: "kf-1", time: 0, value: [0, 5, 10], easing: "easeInOut" },
            { id: "kf-2", time: 5, value: [5, 3, 8], easing: "easeInOut" },
            { id: "kf-3", time: 10, value: [0, 2, 5], easing: "linear" },
          ],
        },
        {
          id: "trk-cam-fov",
          name: "Camera FOV",
          type: "camera",
          targetId: "camera-main",
          property: "fov",
          color: "var(--aethel-warning)",
          keyframes: [
            { id: "kf-fov-1", time: 0, value: 60, easing: "linear" },
            { id: "kf-fov-2", time: 8, value: 45, easing: "easeOut" },
          ],
        },
      ],
    },
    {
      id: "grp-actors",
      name: "Actors",
      tracks: [
        {
          id: "trk-hero-pos",
          name: "Hero Position",
          type: "transform",
          targetId: "actor-hero",
          property: "position",
          keyframes: [
            { id: "kf-hero-1", time: 2, value: [0, 0, 0], easing: "easeIn" },
            { id: "kf-hero-2", time: 6, value: [3, 0, 2], easing: "easeOut" },
          ],
        },
      ],
    },
    {
      id: "grp-lights",
      name: "Lighting",
      tracks: [
        {
          id: "trk-sun",
          name: "Sun Intensity",
          type: "light",
          targetId: "light-sun",
          property: "intensity",
          keyframes: [
            { id: "kf-sun-1", time: 0, value: 0.2, easing: "linear" },
            { id: "kf-sun-2", time: 15, value: 1.0, easing: "easeIn" },
          ],
        },
      ],
    },
    {
      id: "grp-audio",
      name: "Audio",
      tracks: [
        {
          id: "trk-music",
          name: "Background Music",
          type: "audio",
          targetId: "audio-bgm",
          property: "volume",
          keyframes: [
            { id: "kf-music-1", time: 0, value: 0, easing: "linear" },
            { id: "kf-music-2", time: 3, value: 1.0, easing: "easeIn" },
          ],
        },
      ],
    },
  ],
};
