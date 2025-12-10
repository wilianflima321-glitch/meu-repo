/**
 * Task Auto-detection
 * Automatically detects tasks from various build systems
 */

export interface Task {
  id: string;
  label: string;
  type: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  problemMatcher?: string[];
  group?: 'build' | 'test' | 'clean' | 'run';
  isBackground?: boolean;
  presentation?: {
    reveal?: 'always' | 'silent' | 'never';
    panel?: 'shared' | 'dedicated' | 'new';
    clear?: boolean;
  };
}

export interface TaskDetector {
  name: string;
  detect(workspaceRoot: string): Promise<Task[]>;
  isAvailable(workspaceRoot: string): Promise<boolean>;
}

/**
 * NPM Task Detector
 */
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
      console.error('[NPM Detector] Error detecting tasks:', error);
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
    // Mock implementation
    console.log(`[NPM Detector] Reading: ${path}`);
    return '{"scripts": {"build": "tsc", "test": "jest", "start": "node dist/index.js"}}';
  }
}

/**
 * Maven Task Detector
 */
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
      console.error('[Maven Detector] Error detecting tasks:', error);
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
    console.log(`[Maven Detector] Reading: ${path}`);
    return '<project></project>';
  }
}

/**
 * Gradle Task Detector
 */
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
      console.error('[Gradle Detector] Error detecting tasks:', error);
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
    console.log(`[Gradle Detector] Reading: ${path}`);
    return 'plugins { id "java" }';
  }
}

/**
 * Go Task Detector
 */
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
      console.error('[Go Detector] Error detecting tasks:', error);
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
    console.log(`[Go Detector] Reading: ${path}`);
    return 'module example.com/myapp';
  }
}

/**
 * Cargo (Rust) Task Detector
 */
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
      console.error('[Cargo Detector] Error detecting tasks:', error);
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
    console.log(`[Cargo Detector] Reading: ${path}`);
    return '[package]\nname = "myapp"';
  }
}

/**
 * Makefile Task Detector
 */
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
        
        // Skip special targets
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
      console.error('[Makefile Detector] Error detecting tasks:', error);
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
    console.log(`[Makefile Detector] Reading: ${path}`);
    return 'all:\n\tgcc main.c\n\nclean:\n\trm -f *.o\n\ntest:\n\t./run_tests.sh';
  }
}

/**
 * Python Task Detector
 */
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
      console.error('[Python Detector] Error detecting tasks:', error);
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
    console.log(`[Python Detector] Reading: ${path}`);
    return 'from setuptools import setup';
  }
}

/**
 * Task Detection Manager
 */
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

  /**
   * Detect all tasks in workspace
   */
  async detectAllTasks(workspaceRoot: string): Promise<Task[]> {
    const allTasks: Task[] = [];

    for (const detector of this.detectors) {
      try {
        const isAvailable = await detector.isAvailable(workspaceRoot);
        if (isAvailable) {
          const tasks = await detector.detect(workspaceRoot);
          allTasks.push(...tasks);
          console.log(`[Task Detection] Found ${tasks.length} ${detector.name} tasks`);
        }
      } catch (error) {
        console.error(`[Task Detection] Error with ${detector.name} detector:`, error);
      }
    }

    return allTasks;
  }

  /**
   * Get available detectors
   */
  getAvailableDetectors(): string[] {
    return this.detectors.map(d => d.name);
  }

  /**
   * Add custom detector
   */
  addDetector(detector: TaskDetector): void {
    this.detectors.push(detector);
    console.log(`[Task Detection] Added custom detector: ${detector.name}`);
  }
}

// Singleton instance
let taskDetectionManagerInstance: TaskDetectionManager | null = null;

export function getTaskDetectionManager(): TaskDetectionManager {
  if (!taskDetectionManagerInstance) {
    taskDetectionManagerInstance = new TaskDetectionManager();
  }
  return taskDetectionManagerInstance;
}
