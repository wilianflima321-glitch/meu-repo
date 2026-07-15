/** Gameplay tag primitives shared by the ability runtime and editor tools. */

// ============================================================================
// GAMEPLAY TAGS
// ============================================================================

export class GameplayTag {
  constructor(public readonly name: string) {}

  matches(other: GameplayTag): boolean {
    return this.name === other.name || other.name.startsWith(this.name + '.');
  }

  isChildOf(parent: GameplayTag): boolean {
    return this.name.startsWith(parent.name + '.');
  }

  getParent(): GameplayTag | null {
    const lastDot = this.name.lastIndexOf('.');
    if (lastDot === -1) return null;
    return new GameplayTag(this.name.substring(0, lastDot));
  }

  static fromString(str: string): GameplayTag {
    return new GameplayTag(str);
  }
}

export class GameplayTagContainer {
  private tags: Set<string> = new Set();

  addTag(tag: GameplayTag): void {
    this.tags.add(tag.name);
  }

  removeTag(tag: GameplayTag): void {
    this.tags.delete(tag.name);
  }

  hasTag(tag: GameplayTag): boolean {
    return this.tags.has(tag.name);
  }

  hasAny(tags: GameplayTag[]): boolean {
    return tags.some(t => this.hasTag(t));
  }

  hasAll(tags: GameplayTag[]): boolean {
    return tags.every(t => this.hasTag(t));
  }

  matchesQuery(required: GameplayTag[], blocked: GameplayTag[]): boolean {
    if (blocked.some(t => this.hasTag(t))) return false;
    return required.every(t => this.hasTag(t));
  }

  getTags(): GameplayTag[] {
    return Array.from(this.tags).map(name => new GameplayTag(name));
  }

  clear(): void {
    this.tags.clear();
  }
}
