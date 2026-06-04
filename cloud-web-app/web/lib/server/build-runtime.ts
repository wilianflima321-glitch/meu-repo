import type { ChildProcess } from 'child_process';
import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { collectArtifacts } from './build-runtime.artifacts';
import { detectBuildTool } from './build-runtime.tool-detection';
import {
  parseEsbuildErrors,
  parseGoErrors,
  parseTscErrors,
  parseWebpackErrors,
} from './build-runtime.diagnostics';
import type {
  BuildArtifact,
  BuildConfig,
  BuildDiagnostic,
  BuildResult,
  BuildTool,
} from './build-runtime.types';
export type {
  BuildArtifact,
  BuildConfig,
  BuildDiagnostic,
  BuildPlatform,
  BuildProgress,
  BuildResult,
  BuildTool,
  CargoOptions,
  EsbuildOptions,
  TypeScriptOptions,
  ViteOptions,
  WebpackOptions,
} from './build-runtime.types';
import { resolveWorkspaceRoot } from './workspace-path';

const execAsync = promisify(exec);

// ============================================================================
// BUILD RUNTIME CLASS
// ============================================================================

export class BuildRuntime extends EventEmitter {
  private activeBuild: ChildProcess | null = null;
  private buildId: string | null = null;

  constructor() {
    super();
  }

  /**
   * Executa um build
   */
  async build(config: BuildConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const diagnostics: BuildDiagnostic[] = [];
    const artifacts: BuildArtifact[] = [];

    const projectPath = resolveWorkspaceRoot(config.projectPath);
    this.buildId = `build_${Date.now()}`;

    this.emit('buildStart', { buildId: this.buildId, config });

    try {
      // Detect build tool if auto
      const tool = config.tool || await detectBuildTool(projectPath);

      this.emitProgress('initializing', 0, `Initializing ${tool} build...`);

      let result: BuildResult;

      switch (tool) {
        case 'esbuild':
          result = await this.buildWithEsbuild(config, projectPath, diagnostics, artifacts);
          break;
        case 'tsc':
          result = await this.buildWithTsc(config, projectPath, diagnostics, artifacts);
          break;
        case 'vite':
          result = await this.buildWithVite(config, projectPath, diagnostics, artifacts);
          break;
        case 'webpack':
          result = await this.buildWithWebpack(config, projectPath, diagnostics, artifacts);
          break;
        case 'cargo':
          result = await this.buildWithCargo(config, projectPath, diagnostics, artifacts);
          break;
        case 'go':
          result = await this.buildWithGo(config, projectPath, diagnostics, artifacts);
          break;
        default:
          result = await this.buildWithCustom(config, projectPath, diagnostics, artifacts);
      }

      result.duration = Date.now() - startTime;

      this.emit('buildComplete', { buildId: this.buildId, result });
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      diagnostics.push({ type: 'error', message: errorMsg });

      const result: BuildResult = {
        success: false,
        duration: Date.now() - startTime,
        artifacts: [],
        diagnostics,
      };

      this.emit('buildFailed', { buildId: this.buildId, error: errorMsg });
      return result;
    } finally {
      this.activeBuild = null;
      this.buildId = null;
    }
  }

  /**
   * Cancela o build atual
   */
  cancel(): void {
    if (this.activeBuild) {
      this.activeBuild.kill('SIGTERM');
      this.emit('buildCancelled', { buildId: this.buildId });
    }
  }
  // ==========================================================================
  // ESBUILD
  // ==========================================================================

  private async buildWithEsbuild(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const options = config.esbuild || {};
    const entryPoint = config.entryPoint || 'src/index.ts';
    const outputPath = config.outputPath || 'dist';

    const args = [
      entryPoint,
      '--bundle',
      `--outdir=${outputPath}`,
      `--platform=${config.platform === 'node' ? 'node' : 'browser'}`,
    ];

    if (config.mode === 'production') {
      args.push('--minify');
    }

    if (options.sourcemap) {
      args.push(`--sourcemap${typeof options.sourcemap === 'string' ? `=${options.sourcemap}` : ''}`);
    }

    if (options.format) {
      args.push(`--format=${options.format}`);
    }

    if (options.target) {
      args.push(`--target=${options.target.join(',')}`);
    }

    if (options.external) {
      for (const ext of options.external) {
        args.push(`--external:${ext}`);
      }
    }

    if (options.metafile) {
      args.push('--metafile=meta.json');
    }

    this.emitProgress('bundling', 30, 'Running esbuild...');

    return new Promise((resolve) => {
      const proc = spawn('npx', ['esbuild', ...args], {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        this.emitProgress('bundling', 50, data.toString().trim());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        parseEsbuildErrors(data.toString(), diagnostics);
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          // Collect artifacts
          const outDir = path.join(projectPath, outputPath);
          await collectArtifacts(outDir, artifacts);

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
            stats: {
              files: artifacts.length,
              totalSize: artifacts.reduce((sum, a) => sum + a.size, 0),
              entryPoints: [entryPoint],
            },
          });
        } else {
          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // TYPESCRIPT
  // ==========================================================================

  private async buildWithTsc(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const options = config.typescript || {};

    const args = ['--build'];

    if (options.project) {
      args.push('--project', options.project);
    }

    this.emitProgress('compiling', 30, 'Running TypeScript compiler...');

    return new Promise((resolve) => {
      const proc = spawn('npx', ['tsc', ...args], {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        this.emitProgress('compiling', 50, data.toString().trim());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        parseTscErrors(data.toString(), diagnostics);
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          // Collect artifacts
          const outDir = path.join(projectPath, options.outDir || 'dist');
          await collectArtifacts(outDir, artifacts);

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
          });
        } else {
          // Parse stderr for errors
          parseTscErrors(stderr, diagnostics);

          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // VITE
  // ==========================================================================

  private async buildWithVite(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const options = config.vite || {};

    const args = ['build'];

    if (options.config) {
      args.push('--config', options.config);
    }

    if (options.mode) {
      args.push('--mode', options.mode);
    }

    if (options.outDir) {
      args.push('--outDir', options.outDir);
    }

    this.emitProgress('bundling', 30, 'Running Vite build...');

    return new Promise((resolve) => {
      const proc = spawn('npx', ['vite', ...args], {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        this.emitProgress('bundling', 50, output.trim());

        // Parse Vite output for artifacts
        const sizeMatch = output.match(/(\S+)\s+(\d+\.\d+)\s+(kB|KB|MB)/g);
        // Handled in collectArtifacts
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          const outDir = path.join(projectPath, options.outDir || 'dist');
          await collectArtifacts(outDir, artifacts);

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
          });
        } else {
          diagnostics.push({ type: 'error', message: stderr || 'Vite build failed' });

          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // WEBPACK
  // ==========================================================================

  private async buildWithWebpack(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const options = config.webpack || {};

    const args: string[] = [];

    if (options.config) {
      args.push('--config', options.config);
    }

    if (config.mode === 'production') {
      args.push('--mode', 'production');
    } else {
      args.push('--mode', 'development');
    }

    if (options.profile) {
      args.push('--profile');
    }

    this.emitProgress('bundling', 30, 'Running Webpack build...');

    return new Promise((resolve) => {
      const proc = spawn('npx', ['webpack', ...args], {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        this.emitProgress('bundling', 50, data.toString().trim().slice(0, 100));
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        parseWebpackErrors(data.toString(), diagnostics);
      });

      proc.on('close', async (code) => {
        // Parse webpack output for warnings
        parseWebpackErrors(stdout, diagnostics);

        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          const outDir = path.join(projectPath, 'dist');
          await collectArtifacts(outDir, artifacts);

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
          });
        } else {
          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // CARGO (RUST)
  // ==========================================================================

  private async buildWithCargo(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const options = config.cargo || {};

    const args = ['build', '--message-format=json'];

    if (options.release || config.mode === 'production') {
      args.push('--release');
    }

    if (options.target) {
      args.push('--target', options.target);
    }

    if (options.features && options.features.length > 0) {
      args.push('--features', options.features.join(','));
    }

    this.emitProgress('compiling', 30, 'Running Cargo build...');

    return new Promise((resolve) => {
      const proc = spawn('cargo', args, {
        cwd: projectPath,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;

      proc.stdout?.on('data', async (data: Buffer) => {
        const lines = data.toString().split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const msg = JSON.parse(line);

            if (msg.reason === 'compiler-message') {
              const level = msg.message.level;
              const text = msg.message.message;
              const span = msg.message.spans?.[0];

              diagnostics.push({
                type: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
                message: text,
                file: span?.file_name,
                line: span?.line_start,
                column: span?.column_start,
              });
            } else if (msg.reason === 'compiler-artifact') {
              for (const file of msg.filenames || []) {
                const stats = await fs.stat(file).catch(() => null);
                if (stats) {
                  artifacts.push({
                    name: path.basename(file),
                    path: file,
                    size: stats.size,
                    type: file.endsWith('.exe') || !path.extname(file) ? 'executable' : 'library',
                  });
                }
              }

              this.emitProgress('compiling', 70, `Built: ${msg.target?.name}`);
            } else if (msg.reason === 'build-finished') {
              if (msg.success) {
                this.emitProgress('complete', 100, 'Build successful!');
              }
            }
          } catch {
            // Not JSON, ignore
          }
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        // Cargo outputs progress to stderr
        this.emitProgress('compiling', 50, output.trim().slice(0, 100));
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          duration: 0,
          artifacts,
          diagnostics,
        });
      });
    });
  }

  // ==========================================================================
  // GO
  // ==========================================================================

  private async buildWithGo(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const outputPath = config.outputPath || './bin/app';

    const args = ['build', '-o', outputPath];

    if (config.mode === 'production') {
      args.push('-ldflags', '-s -w'); // Strip debug info
    }

    this.emitProgress('compiling', 30, 'Running Go build...');

    return new Promise((resolve) => {
      const proc = spawn('go', args, {
        cwd: projectPath,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        this.emitProgress('compiling', 50, data.toString().trim());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        parseGoErrors(data.toString(), diagnostics);
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          // Get artifact info
          const fullPath = path.join(projectPath, outputPath);
          const stats = await fs.stat(fullPath).catch(() => null);

          if (stats) {
            artifacts.push({
              name: path.basename(outputPath),
              path: fullPath,
              size: stats.size,
              type: 'executable',
            });
          }

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
          });
        } else {
          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // CUSTOM
  // ==========================================================================

  private async buildWithCustom(
    config: BuildConfig,
    projectPath: string,
    diagnostics: BuildDiagnostic[],
    artifacts: BuildArtifact[]
  ): Promise<BuildResult> {
    const args = config.args || [];

    if (args.length === 0) {
      diagnostics.push({ type: 'error', message: 'No build command specified' });
      return { success: false, duration: 0, artifacts: [], diagnostics };
    }

    const [cmd, ...cmdArgs] = args;

    this.emitProgress('building', 30, `Running: ${cmd}`);

    return new Promise((resolve) => {
      const proc = spawn(cmd, cmdArgs, {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, ...config.env },
      });

      this.activeBuild = proc;

      proc.stdout?.on('data', (data: Buffer) => {
        this.emitProgress('building', 50, data.toString().trim().slice(0, 100));
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const err = data.toString().trim();
        if (err) {
          diagnostics.push({ type: 'warning', message: err });
        }
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          this.emitProgress('complete', 100, 'Build successful!');

          if (config.outputPath) {
            const outDir = path.join(projectPath, config.outputPath);
            await collectArtifacts(outDir, artifacts);
          }

          resolve({
            success: true,
            duration: 0,
            artifacts,
            diagnostics,
          });
        } else {
          resolve({
            success: false,
            duration: 0,
            artifacts: [],
            diagnostics,
          });
        }
      });
    });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private emitProgress(phase: string, progress: number, message: string): void {
    this.emit('progress', { buildId: this.buildId, phase, progress, message });
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let buildRuntime: BuildRuntime | null = null;

export function getBuildRuntime(): BuildRuntime {
  if (!buildRuntime) {
    buildRuntime = new BuildRuntime();
  }
  return buildRuntime;
}

export { BuildRuntime as default };
