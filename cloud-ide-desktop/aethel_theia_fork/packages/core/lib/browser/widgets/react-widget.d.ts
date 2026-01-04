export class ReactWidget {
  id: string;
  title: any;
  protected readonly toDispose: any[];
  update(): void;
  protected render(): any;
  dispose(): void;
  protected onActivateRequest(msg: any): void;
  addClass(className: string): void;
  node: any;
  isAttached?: boolean;
}
