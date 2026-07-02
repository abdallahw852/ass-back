export class HandleSubscriptionWebhookCommand {
  constructor(
    public readonly body: unknown,
    public readonly hmac: string,
  ) {}
}
