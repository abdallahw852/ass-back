export class SubscribeCommand {
  constructor(
    public readonly userId: number,
    public readonly planId: string,
  ) {}
}
