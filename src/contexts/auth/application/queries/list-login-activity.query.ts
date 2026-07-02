export class ListLoginActivityQuery {
  constructor(
    public readonly userId: number,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
