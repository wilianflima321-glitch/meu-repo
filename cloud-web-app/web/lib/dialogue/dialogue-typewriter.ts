export class DialogueTypewriter {
  private typewriterSpeed = 50;
  private interval: NodeJS.Timeout | null = null;
  private currentText = '';
  private displayedText = '';
  private typing = false;

  start(text: string, onUpdate: (text: string, complete: boolean) => void): void {
    this.stop();
    this.currentText = text;
    this.displayedText = '';
    this.typing = true;

    let charIndex = 0;
    this.interval = setInterval(() => {
      if (charIndex < this.currentText.length) {
        this.displayedText = this.currentText.substring(0, charIndex + 1);
        charIndex++;
        onUpdate(this.displayedText, false);
        return;
      }

      this.complete(onUpdate);
    }, this.typewriterSpeed);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.typing = false;
  }

  complete(onUpdate: (text: string, complete: boolean) => void): void {
    this.stop();
    this.displayedText = this.currentText;
    onUpdate(this.displayedText, true);
  }

  setCharsPerSecond(charsPerSecond: number): void {
    this.typewriterSpeed = 1000 / charsPerSecond;
  }

  isTyping(): boolean {
    return this.typing;
  }

  getDisplayedText(): string {
    return this.displayedText;
  }
}
