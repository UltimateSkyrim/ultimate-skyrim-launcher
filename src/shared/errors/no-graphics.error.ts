export class NoGraphicsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoGraphics";
  }
}
