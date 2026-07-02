export class MarkNotificationReadCommand {
  constructor(
    public readonly notificationPublicId: string,
    public readonly userId: number,
  ) {}
}
