export class ListNotificationsQuery {
  constructor(
    public readonly userId: number,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
  ) {}
}
