export type DragonPreset = "ember" | "mint" | "lavender";
export type DragonPhase =
  | "egg"
  | "hatching"
  | "idle"
  | "walking"
  | "anticipating"
  | "flying"
  | "landing"
  | "eating"
  | "sneezing"
  | "sleeping";
export interface PocketDragonOptions {
  root?: HTMLElement;
  zIndex?: number;
  preset?: DragonPreset;
  size?: number;
  speed?: number;
  surfaces?: string;
  hatchOnStart?: boolean;
  interaction?: boolean;
  sparks?: boolean;
  maxFPS?: 30 | 60;
  respectReducedMotion?: boolean;
}
export interface DragonState {
  ready: boolean;
  paused: boolean;
  phase: DragonPhase;
  x: number;
  y: number;
  direction: number;
  age: number;
  fed: number;
  flights: number;
  sneezes: number;
  food: { x: number; y: number; life: number } | null;
  anchor: string | null;
  reducedMotion: boolean;
}
export interface PocketDragonController {
  update(options: PocketDragonOptions): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  hatch(): void;
  feed(x?: number, y?: number): void;
  fly(): void;
  sneeze(): void;
  sleep(): void;
  wake(): void;
  reset(): void;
  getState(): DragonState;
}
export interface Config {
  root: HTMLElement | undefined;
  zIndex: number;
  preset: DragonPreset;
  size: number;
  speed: number;
  surfaces: string;
  hatchOnStart: boolean;
  interaction: boolean;
  sparks: boolean;
  maxFPS: 30 | 60;
  respectReducedMotion: boolean;
}
