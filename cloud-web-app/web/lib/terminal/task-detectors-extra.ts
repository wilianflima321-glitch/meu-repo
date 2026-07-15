import { logger } from '@/lib/observability/logger';

import type { Task, TaskDetector } from './task-detector-contracts';
import { readTaskWorkspaceFile as readWorkspaceFile } from './task-detector-utils';

export class GoTaskDetector implements TaskDetector {
  name = 'go';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const goModPath = `${workspaceRoot}/go.mod`;
      await this.readFile(goModPath);

      const tasks: Task[] = [
        {
          id: 'go:build',
          label: 'go: build',
          type: 'go',
          command: 'go',
          args: ['build', './...'],
          cwd: workspaceRoot,
          problemMatcher: ['$go'],
          group: 'build',
        },
        {
          id: 'go:test',
          label: 'go: test',
          type: 'go',
          command: 'go',
          args: ['test', './...'],
          cwd: workspaceRoot,
          problemMatcher: ['$go'],
          group: 'test',
        },
        {
          id: 'go:run',
          label: 'go: run',
          type: 'go',
          command: 'go',
          args: ['run', '.'],
          cwd: workspaceRoot,
          problemMatcher: ['$go'],
          group: 'run',
        },
        {
          id: 'go:clean',
          label: 'go: clean',
          type: 'go',
          command: 'go',
          args: ['clean'],
          cwd: workspaceRoot,
          group: 'clean',
        },
        {
          id: 'go:mod-tidy',
          label: 'go: mod tidy',
          type: 'go',
          command: 'go',
          args: ['mod', 'tidy'],
          cwd: workspaceRoot,
        },
      ];

      return tasks;
    } catch (error) {
      logger.error('[Go Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const goModPath = `${workspaceRoot}/go.mod`;
      await this.readFile(goModPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export class CargoTaskDetector implements TaskDetector {
  name = 'cargo';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const cargoTomlPath = `${workspaceRoot}/Cargo.toml`;
      await this.readFile(cargoTomlPath);

      const tasks: Task[] = [
        {
          id: 'cargo:build',
          label: 'cargo: build',
          type: 'cargo',
          command: 'cargo',
          args: ['build'],
          cwd: workspaceRoot,
          problemMatcher: ['$rustc'],
          group: 'build',
        },
        {
          id: 'cargo:build-release',
          label: 'cargo: build --release',
          type: 'cargo',
          command: 'cargo',
          args: ['build', '--release'],
          cwd: workspaceRoot,
          problemMatcher: ['$rustc'],
          group: 'build',
        },
        {
          id: 'cargo:test',
          label: 'cargo: test',
          type: 'cargo',
          command: 'cargo',
          args: ['test'],
          cwd: workspaceRoot,
          problemMatcher: ['$rustc'],
          group: 'test',
        },
        {
          id: 'cargo:run',
          label: 'cargo: run',
          type: 'cargo',
          command: 'cargo',
          args: ['run'],
          cwd: workspaceRoot,
          problemMatcher: ['$rustc'],
          group: 'run',
        },
        {
          id: 'cargo:clean',
          label: 'cargo: clean',
          type: 'cargo',
          command: 'cargo',
          args: ['clean'],
          cwd: workspaceRoot,
          group: 'clean',
        },
        {
          id: 'cargo:check',
          label: 'cargo: check',
          type: 'cargo',
          command: 'cargo',
          args: ['check'],
          cwd: workspaceRoot,
          problemMatcher: ['$rustc'],
        },
      ];

      return tasks;
    } catch (error) {
      logger.error('[Cargo Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const cargoTomlPath = `${workspaceRoot}/Cargo.toml`;
      await this.readFile(cargoTomlPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export class MakefileTaskDetector implements TaskDetector {
  name = 'make';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const makefilePath = `${workspaceRoot}/Makefile`;
      const content = await this.readFile(makefilePath);

      const tasks: Task[] = [];
      const targetRegex = /^([a-zA-Z0-9_-]+):/gm;
      let match;

      while ((match = targetRegex.exec(content)) !== null) {
        const target = match[1];
        
        if (target.startsWith('.') || target === 'PHONY') {
          continue;
        }

        tasks.push({
          id: `make:${target}`,
          label: `make: ${target}`,
          type: 'make',
          command: 'make',
          args: [target],
          cwd: workspaceRoot,
          problemMatcher: ['$gcc'],
          group: this.getGroup(target),
          presentation: {
            reveal: 'always',
            panel: 'shared',
          },
        });
      }

      return tasks;
    } catch (error) {
      logger.error('[Makefile Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const makefilePath = `${workspaceRoot}/Makefile`;
      await this.readFile(makefilePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getGroup(target: string): Task['group'] {
    if (target === 'build' || target === 'all' || target === 'compile') {
      return 'build';
    }
    if (target === 'test') {
      return 'test';
    }
    if (target === 'clean') {
      return 'clean';
    }
    if (target === 'run') {
      return 'run';
    }
    return undefined;
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export class PythonTaskDetector implements TaskDetector {
  name = 'python';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const setupPyPath = `${workspaceRoot}/setup.py`;
      await this.readFile(setupPyPath);

      const tasks: Task[] = [
        {
          id: 'python:install',
          label: 'python: install',
          type: 'python',
          command: 'pip',
          args: ['install', '-e', '.'],
          cwd: workspaceRoot,
          group: 'build',
        },
        {
          id: 'python:test',
          label: 'python: test',
          type: 'python',
          command: 'pytest',
          args: [],
          cwd: workspaceRoot,
          problemMatcher: ['$pytest'],
          group: 'test',
        },
        {
          id: 'python:lint',
          label: 'python: lint',
          type: 'python',
          command: 'pylint',
          args: ['src'],
          cwd: workspaceRoot,
          problemMatcher: ['$pylint'],
        },
      ];

      return tasks;
    } catch (error) {
      logger.error('[Python Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const setupPyPath = `${workspaceRoot}/setup.py`;
      await this.readFile(setupPyPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}
