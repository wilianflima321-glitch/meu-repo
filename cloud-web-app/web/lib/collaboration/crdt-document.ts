import type { CRDTCharacter } from './collaboration-contracts';

export class CRDTDocument {
  private characters: CRDTCharacter[] = [];
  private siteId: string;
  private clock = 0;

  constructor(siteId: string) {
    this.siteId = siteId;
  }

  generatePosition(index: number): number[] {
    const prevPos = index > 0 ? this.characters[index - 1]?.position || [0] : [0];
    const nextPos = this.characters[index]?.position || [prevPos[0] + 2];
    const newPos: number[] = [];
    let i = 0;

    while (i < prevPos.length || i < nextPos.length) {
      const p = prevPos[i] || 0;
      const n = nextPos[i] || p + 2;

      if (n - p > 1) {
        newPos.push(Math.floor((p + n) / 2));
        break;
      }

      newPos.push(p);
      i++;
    }

    if (newPos.length === 0) {
      newPos.push(Math.floor(((prevPos[prevPos.length - 1] || 0) + (nextPos[0] || 2)) / 2));
    }

    return newPos;
  }

  localInsert(index: number, char: string): CRDTCharacter {
    const position = this.generatePosition(index);
    const id = `${this.siteId}:${++this.clock}`;
    const character: CRDTCharacter = {
      id,
      value: char,
      visible: true,
      position,
      userId: this.siteId,
      timestamp: Date.now(),
    };

    this.characters.splice(index, 0, character);
    return character;
  }

  localDelete(index: number): CRDTCharacter | null {
    if (index >= this.characters.length) return null;

    const char = this.characters[index];
    char.visible = false;
    return char;
  }

  remoteInsert(char: CRDTCharacter): void {
    const index = this.findInsertIndex(char.position);
    this.characters.splice(index, 0, char);
  }

  remoteDelete(charId: string): void {
    const char = this.characters.find(c => c.id === charId);
    if (char) {
      char.visible = false;
    }
  }

  private findInsertIndex(position: number[]): number {
    for (let i = 0; i < this.characters.length; i++) {
      if (this.comparePositions(position, this.characters[i].position) < 0) {
        return i;
      }
    }
    return this.characters.length;
  }

  private comparePositions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  toString(): string {
    return this.characters
      .filter(c => c.visible)
      .map(c => c.value)
      .join('');
  }

  getVersion(): number {
    return this.clock;
  }
}
