export interface Disposable {
  dispose(): void;
}

export class DisposableCollection implements Disposable {
  constructor(...disposables: Disposable[]);
  push(disposable: Disposable): Disposable;
  dispose(): void;
}
