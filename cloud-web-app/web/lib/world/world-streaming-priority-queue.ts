export class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    const newItem = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, newItem);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(newItem);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  has(predicate: (item: T) => boolean): boolean {
    return this.items.some((i) => predicate(i.item));
  }

  remove(predicate: (item: T) => boolean): boolean {
    const index = this.items.findIndex((i) => predicate(i.item));
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
}

