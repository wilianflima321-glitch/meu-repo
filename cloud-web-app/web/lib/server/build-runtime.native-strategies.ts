import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { collectArtifacts } from './build-runtime.artifacts';
import { parseGoErrors } from './build-runtime.diagnostics';
import type { BuildArtifact, BuildConfig, BuildDiagnostic, BuildResult } from './build-runtime.types';

export interface BuildStrategyContext {
  artifacts: BuildArtifact[];
  config: BuildConfig;
  diagnostics: BuildDiagnostic[];
  emitProgress(phase: string, progress: number, message: string): void;
  projectPath: string;
  setActiveBuild(process: ChildProcess): void;
}

export async function buildWithCargoStrategy({
  artifacts,
  config,
  diagnostics,
  emitProgress,
  projectPath,
  setActiveBuild,
}: BuildStrategyContext): Promise<BuildResult> {
  const options = config.cargo || {};
  const args = ['build', '--message-format=json'];

  if (options.release || config.mode === 'production') args.push('--release');
  if (options.target) args.push('--target', options.target);
  if (options.features && options.features.length > 0) args.push('--features', options.features.join(','));

  emitProgress('compiling', 30, 'Running Cargo build...');

  return new Promise((resolve) => {
    const proc = spawn('cargo', args, {
      cwd: projectPath,
      env: { ...process.env, ...config.env },
    });
    setActiveBuild(proc);

    proc.stdout?.on('data', async (data: Buffer) => {
      const lines = data.toString().split('\n').filter((line) => line.trim());

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

            emitProgress('compiling', 70, `Built: ${msg.target?.name}`);
          } else if (msg.reason === 'build-finished' && msg.success) {
            emitProgress('complete', 100, 'Build successful!');
          }
        } catch {
          // Cargo can emit non-JSON progress lines; diagnostics are emitted as JSON.
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      emitProgress('compiling', 50, data.toString().trim().slice(0, 100));
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

export async function buildWithGoStrategy({
  artifacts,
  config,
  diagnostics,
  emitProgress,
  projectPath,
  setActiveBuild,
}: BuildStrategyContext): Promise<BuildResult> {
  const outputPath = config.outputPath || './bin/app';
  const args = ['build', '-o', outputPath];

  if (config.mode === 'production') args.push('-ldflags', '-s -w');

  emitProgress('compiling', 30, 'Running Go build...');

  return new Promise((resolve) => {
    const proc = spawn('go', args, {
      cwd: projectPath,
      env: { ...process.env, ...config.env },
    });
    setActiveBuild(proc);

    proc.stdout?.on('data', (data: Buffer) => {
      emitProgress('compiling', 50, data.toString().trim());
    });

    proc.stderr?.on('data', (data: Buffer) => {
      parseGoErrors(data.toString(), diagnostics);
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        emitProgress('complete', 100, 'Build successful!');
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
      }

      resolve({
        success: code === 0,
        duration: 0,
        artifacts: code === 0 ? artifacts : [],
        diagnostics,
      });
    });
  });
}

export async function buildWithCustomStrategy({
  artifacts,
  config,
  diagnostics,
  emitProgress,
  projectPath,
  setActiveBuild,
}: BuildStrategyContext): Promise<BuildResult> {
  const args = config.args || [];

  if (args.length === 0) {
    diagnostics.push({ type: 'error', message: 'No build command specified' });
    return { success: false, duration: 0, artifacts: [], diagnostics };
  }

  const [cmd, ...cmdArgs] = args;
  emitProgress('building', 30, `Running: ${cmd}`);

  return new Promise((resolve) => {
    const proc = spawn(cmd, cmdArgs, {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, ...config.env },
    });
    setActiveBuild(proc);

    proc.stdout?.on('data', (data: Buffer) => {
      emitProgress('building', 50, data.toString().trim().slice(0, 100));
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const err = data.toString().trim();
      if (err) diagnostics.push({ type: 'warning', message: err });
    });

    proc.on('close', async (code) => {
      if (code === 0 && config.outputPath) {
        emitProgress('complete', 100, 'Build successful!');
        const outDir = path.join(projectPath, config.outputPath);
        await collectArtifacts(outDir, artifacts);
      } else if (code === 0) {
        emitProgress('complete', 100, 'Build successful!');
      }

      resolve({
        success: code === 0,
        duration: 0,
        artifacts: code === 0 ? artifacts : [],
        diagnostics,
      });
    });
  });
}
