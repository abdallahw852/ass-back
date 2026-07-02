export class UpgradeSubscriptionCommand {
  constructor(
    public readonly userId: number,
    public readonly planId: string,
  ) {}
}
