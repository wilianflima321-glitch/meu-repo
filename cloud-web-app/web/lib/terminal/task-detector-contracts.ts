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
