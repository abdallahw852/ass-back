export class HandlePaymentWebhookCommand {
  constructor(
    public readonly body: unknown,
    public readonly hmac: string,
  ) {}
}
