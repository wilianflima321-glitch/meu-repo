import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('terminal/task-detector')

import type { Task, TaskDetector } from './task-detector-contracts';
import { CargoTaskDetector, GoTaskDetector, MakefileTaskDetector, PythonTaskDetector } from './task-detectors-extra';
import { readTaskWorkspaceFile } from './task-detector-utils';
export type { Task, TaskDetector } from './task-detector-contracts';

export const readWorkspaceFile = readTaskWorkspaceFile;

export class NPMTaskDetector implements TaskDetector {
  name = 'npm';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const packageJsonPath = `${workspaceRoot}/package.json`;
      const content = await this.readFile(packageJsonPath);
      const packageJson = JSON.parse(content);

      if (!packageJson.scripts) {
        return [];
      }

      const tasks: Task[] = [];

      for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
        tasks.push({
          id: `npm:${scriptName}`,
          label: `npm: ${scriptName}`,
          type: 'npm',
          command: 'npm',
          args: ['run', scriptName],
          cwd: workspaceRoot,
          problemMatcher: this.getProblemMatcher(scriptName),
          group: this.getGroup(scriptName),
          presentation: {
            reveal: 'always',
            panel: 'shared',
          },
        });
      }

      return tasks;
    } catch (error) {
      logger.error('[NPM Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const packageJsonPath = `${workspaceRoot}/package.json`;
      await this.readFile(packageJsonPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getProblemMatcher(scriptName: string): string[] {
    if (scriptName.includes('lint')) {
      return ['$eslint-stylish'];
    }
    if (scriptName.includes('build') || scriptName.includes('compile')) {
      return ['$tsc'];
    }
    if (scriptName.includes('test')) {
      return ['$jest'];
    }
    return [];
  }

  private getGroup(scriptName: string): Task['group'] {
    if (scriptName.includes('build') || scriptName.includes('compile')) {
      return 'build';
    }
    if (scriptName.includes('test')) {
      return 'test';
    }
    if (scriptName.includes('clean')) {
      return 'clean';
    }
    if (scriptName.includes('start') || scriptName.includes('dev')) {
      return 'run';
    }
    return undefined;
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export class MavenTaskDetector implements TaskDetector {
  name = 'maven';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const pomPath = `${workspaceRoot}/pom.xml`;
      await this.readFile(pomPath);

      const commonGoals = [
        'clean', 'compile', 'test', 'package', 'install', 'deploy',
        'verify', 'validate', 'site',
      ];

      const tasks: Task[] = commonGoals.map(goal => ({
        id: `maven:${goal}`,
        label: `maven: ${goal}`,
        type: 'maven',
        command: 'mvn',
        args: [goal],
        cwd: workspaceRoot,
        problemMatcher: ['$maven'],
        group: this.getGroup(goal),
        presentation: {
          reveal: 'always',
          panel: 'shared',
        },
      }));

      return tasks;
    } catch (error) {
      logger.error('[Maven Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const pomPath = `${workspaceRoot}/pom.xml`;
      await this.readFile(pomPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getGroup(goal: string): Task['group'] {
    if (goal === 'compile' || goal === 'package' || goal === 'install') {
      return 'build';
    }
    if (goal === 'test' || goal === 'verify') {
      return 'test';
    }
    if (goal === 'clean') {
      return 'clean';
    }
    return undefined;
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export class GradleTaskDetector implements TaskDetector {
  name = 'gradle';

  async detect(workspaceRoot: string): Promise<Task[]> {
    try {
      const buildGradlePath = `${workspaceRoot}/build.gradle`;
      await this.readFile(buildGradlePath);

      const commonTasks = [
        'clean', 'build', 'test', 'assemble', 'check',
        'jar', 'war', 'bootRun', 'run',
      ];

      const tasks: Task[] = commonTasks.map(taskName => ({
        id: `gradle:${taskName}`,
        label: `gradle: ${taskName}`,
        type: 'gradle',
        command: './gradlew',
        args: [taskName],
        cwd: workspaceRoot,
        problemMatcher: ['$gradle'],
        group: this.getGroup(taskName),
        presentation: {
          reveal: 'always',
          panel: 'shared',
        },
      }));

      return tasks;
    } catch (error) {
      logger.error('[Gradle Detector] Error detecting tasks:', error);
      return [];
    }
  }

  async isAvailable(workspaceRoot: string): Promise<boolean> {
    try {
      const buildGradlePath = `${workspaceRoot}/build.gradle`;
      await this.readFile(buildGradlePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getGroup(taskName: string): Task['group'] {
    if (taskName === 'build' || taskName === 'assemble' || taskName === 'jar') {
      return 'build';
    }
    if (taskName === 'test' || taskName === 'check') {
      return 'test';
    }
    if (taskName === 'clean') {
      return 'clean';
    }
    if (taskName === 'run' || taskName === 'bootRun') {
      return 'run';
    }
    return undefined;
  }

  private async readFile(path: string): Promise<string> {
    return readWorkspaceFile(path);
  }
}

export { CargoTaskDetector, GoTaskDetector, MakefileTaskDetector, PythonTaskDetector } from './task-detectors-extra';

export class TaskDetectionManager {
  private detectors: TaskDetector[] = [
    new NPMTaskDetector(),
    new MavenTaskDetector(),
    new GradleTaskDetector(),
    new GoTaskDetector(),
    new CargoTaskDetector(),
    new MakefileTaskDetector(),
    new PythonTaskDetector(),
  ];

  async detectAllTasks(workspaceRoot: string): Promise<Task[]> {
    const allTasks: Task[] = [];

    for (const detector of this.detectors) {
      try {
        const isAvailable = await detector.isAvailable(workspaceRoot);
        if (isAvailable) {
          const tasks = await detector.detect(workspaceRoot);
          allTasks.push(...tasks);
          log.info(`[Task Detection] Found ${tasks.length} ${detector.name} tasks`);
        }
      } catch (error) {
        logger.error(`[Task Detection] Error with ${detector.name} detector:`, error);
      }
    }

    return allTasks;
  }

  getAvailableDetectors(): string[] {
    return this.detectors.map(d => d.name);
  }

  addDetector(detector: TaskDetector): void {
    this.detectors.push(detector);
    log.info(`[Task Detection] Added custom detector: ${detector.name}`);
  }
}

let taskDetectionManagerInstance: TaskDetectionManager | null = null;

export function getTaskDetectionManager(): TaskDetectionManager {
  if (!taskDetectionManagerInstance) {
    taskDetectionManagerInstance = new TaskDetectionManager();
  }
  return taskDetectionManagerInstance;
}
