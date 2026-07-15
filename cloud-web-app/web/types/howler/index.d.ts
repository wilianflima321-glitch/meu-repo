declare module 'howler' {
  export type HowlCallback = () => void;
  export type HowlErrorCallback = (soundId: number, error: unknown) => void;
  export type HowlPlayCallback = (soundId: number) => void;

  export interface HowlOptions {
    src: string[];
    volume?: number;
    preload?: boolean;
    format?: string[];
    loop?: boolean;
    sprite?: Record<string, [number, number, boolean?]>;
    html5?: boolean;
    rate?: number;
    onload?: HowlCallback;
    onloaderror?: HowlErrorCallback;
    onplay?: HowlPlayCallback;
    onpause?: HowlCallback;
    onstop?: HowlCallback;
    onend?: HowlCallback;
  }

  export class Howl {
    constructor(options: HowlOptions);
    play(spriteOrId?: string | number): number;
    pause(id?: number): void;
    stop(id?: number): void;
    unload(): void;
    loop(): boolean;
    volume(value?: number, id?: number): number;
    fade(from: number, to: number, duration: number, id?: number): void;
    pos(x: number, y: number, z: number, id?: number): void;
    stereo(pan: number, id?: number): void;
    rate(value?: number, id?: number): number;
    seek(value?: number, id?: number): number;
    duration(id?: number): number;
  }

  export const Howler: {
    mute(muted: boolean): void;
    volume(value?: number): number;
    pos(x: number, y: number, z: number): void;
    orientation(x: number, y: number, z: number, xUp?: number, yUp?: number, zUp?: number): void;
    unload(): void;
  };
}
