import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

interface DetectTasksRequest {
  workspaceRoot: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectTasksRequest = await request.json();
    const { workspaceRoot } = body;

    const detectedTasks = [];

    // Detect npm/yarn tasks
    try {
      const packageJsonPath = join(workspaceRoot, 'package.json');
      await access(packageJsonPath);
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts) {
        for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
          detectedTasks.push({
            label: `npm: ${scriptName}`,
            type: 'npm',
            command: 'npm',
            args: ['run', scriptName],
            problemMatcher: ['$tsc', '$eslint-compact'],
            presentation: {
              reveal: 'always',
              panel: 'shared'
            }
          });
        }
      }
    } catch (error) {
      // No package.json
    }

    // Detect Maven tasks
    try {
      const pomPath = join(workspaceRoot, 'pom.xml');
      await access(pomPath);
      
      detectedTasks.push(
        {
          label: 'maven: clean',
          type: 'maven',
          command: 'mvn',
          args: ['clean'],
          problemMatcher: []
        },
        {
          label: 'maven: compile',
          type: 'maven',
          command: 'mvn',
          args: ['compile'],
          problemMatcher: []
        },
        {
          label: 'maven: test',
          type: 'maven',
          command: 'mvn',
          args: ['test'],
          problemMatcher: []
        },
        {
          label: 'maven: package',
          type: 'maven',
          command: 'mvn',
          args: ['package'],
          problemMatcher: []
        }
      );
    } catch (error) {
      // No pom.xml
    }

    // Detect Gradle tasks
    try {
      const gradlePath = join(workspaceRoot, 'build.gradle');
      await access(gradlePath);
      
      detectedTasks.push(
        {
          label: 'gradle: build',
          type: 'gradle',
          command: './gradlew',
          args: ['build'],
          problemMatcher: []
        },
        {
          label: 'gradle: test',
          type: 'gradle',
          command: './gradlew',
          args: ['test'],
          problemMatcher: []
        },
        {
          label: 'gradle: clean',
          type: 'gradle',
          command: './gradlew',
          args: ['clean'],
          problemMatcher: []
        }
      );
    } catch (error) {
      // No build.gradle
    }

    // Detect Go tasks
    try {
      const goModPath = join(workspaceRoot, 'go.mod');
      await access(goModPath);
      
      detectedTasks.push(
        {
          label: 'go: build',
          type: 'go',
          command: 'go',
          args: ['build', './...'],
          problemMatcher: ['$go']
        },
        {
          label: 'go: test',
          type: 'go',
          command: 'go',
          args: ['test', './...'],
          problemMatcher: ['$go']
        },
        {
          label: 'go: run',
          type: 'go',
          command: 'go',
          args: ['run', '.'],
          problemMatcher: ['$go']
        }
      );
    } catch (error) {
      // No go.mod
    }

    // Detect Rust tasks
    try {
      const cargoPath = join(workspaceRoot, 'Cargo.toml');
      await access(cargoPath);
      
      detectedTasks.push(
        {
          label: 'cargo: build',
          type: 'cargo',
          command: 'cargo',
          args: ['build'],
          problemMatcher: ['$rustc']
        },
        {
          label: 'cargo: test',
          type: 'cargo',
          command: 'cargo',
          args: ['test'],
          problemMatcher: ['$rustc']
        },
        {
          label: 'cargo: run',
          type: 'cargo',
          command: 'cargo',
          args: ['run'],
          problemMatcher: ['$rustc']
        },
        {
          label: 'cargo: check',
          type: 'cargo',
          command: 'cargo',
          args: ['check'],
          problemMatcher: ['$rustc']
        }
      );
    } catch (error) {
      // No Cargo.toml
    }

    // Detect Python tasks
    try {
      const requirementsPath = join(workspaceRoot, 'requirements.txt');
      await access(requirementsPath);
      
      detectedTasks.push(
        {
          label: 'python: install dependencies',
          type: 'shell',
          command: 'pip',
          args: ['install', '-r', 'requirements.txt'],
          problemMatcher: []
        }
      );
    } catch (error) {
      // No requirements.txt
    }

    try {
      const setupPyPath = join(workspaceRoot, 'setup.py');
      await access(setupPyPath);
      
      detectedTasks.push(
        {
          label: 'python: install package',
          type: 'shell',
          command: 'pip',
          args: ['install', '-e', '.'],
          problemMatcher: []
        }
      );
    } catch (error) {
      // No setup.py
    }

    // Detect Makefile tasks
    try {
      const makefilePath = join(workspaceRoot, 'Makefile');
      await access(makefilePath);
      
      detectedTasks.push(
        {
          label: 'make: build',
          type: 'shell',
          command: 'make',
          args: [],
          problemMatcher: ['$gcc']
        },
        {
          label: 'make: clean',
          type: 'shell',
          command: 'make',
          args: ['clean'],
          problemMatcher: []
        },
        {
          label: 'make: test',
          type: 'shell',
          command: 'make',
          args: ['test'],
          problemMatcher: []
        }
      );
    } catch (error) {
      // No Makefile
    }

    return NextResponse.json({
      success: true,
      tasks: detectedTasks
    });
  } catch (error) {
    console.error('Failed to detect tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect tasks' },
      { status: 500 }
    );
  }
}
