/** Shared build runtime contracts. */

export type BuildTool =
  | 'esbuild'
  | 'tsc'
  | 'webpack'
  | 'vite'
  | 'rollup'
  | 'cargo'
  | 'go'
  | 'gcc'
  | 'clang'
  | 'python'
  | 'custom';

export type BuildPlatform =
  | 'web'
  | 'node'
  | 'electron'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios';

export interface BuildConfig {
  projectPath: string;
  tool: BuildTool;
  platform: BuildPlatform;
  mode: 'development' | 'production';
  entryPoint?: string;
  outputPath?: string;

  // Tool-specific options
  esbuild?: EsbuildOptions;
  typescript?: TypeScriptOptions;
  webpack?: WebpackOptions;
  vite?: ViteOptions;
  cargo?: CargoOptions;

  // Advanced
  env?: Record<string, string>;
  args?: string[];
}

export interface EsbuildOptions {
  target?: string[];
  format?: 'iife' | 'cjs' | 'esm';
  bundle?: boolean;
  minify?: boolean;
  sourcemap?: boolean | 'inline' | 'external';
  splitting?: boolean;
  metafile?: boolean;
  external?: string[];
  define?: Record<string, string>;
  loader?: Record<string, string>;
}

export interface TypeScriptOptions {
  project?: string;
  outDir?: string;
  declaration?: boolean;
  sourceMap?: boolean;
  strict?: boolean;
  noEmit?: boolean;
}

export interface WebpackOptions {
  config?: string;
  watch?: boolean;
  profile?: boolean;
  analyze?: boolean;
}

export interface ViteOptions {
  config?: string;
  mode?: string;
  base?: string;
  outDir?: string;
}

export interface CargoOptions {
  release?: boolean;
  target?: string;
  features?: string[];
}

export interface BuildProgress {
  phase: string;
  progress: number;
  message: string;
  file?: string;
}

export interface BuildDiagnostic {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface BuildArtifact {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface BuildResult {
  success: boolean;
  duration: number;
  artifacts: BuildArtifact[];
  diagnostics: BuildDiagnostic[];
  stats?: {
    files: number;
    totalSize: number;
    entryPoints: string[];
  };
}
