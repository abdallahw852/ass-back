export class CreatePaymentIntentCommand {
  constructor(
    public readonly userId: number,
    public readonly subscriptionId: string,
  ) {}
}
