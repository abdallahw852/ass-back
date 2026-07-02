export class MarkOrderDeliveredCommand {
  constructor(
    public readonly orderId: string,
    public readonly actorId: number,
  ) {}
}
