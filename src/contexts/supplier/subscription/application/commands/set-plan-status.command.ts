export class SetPlanStatusCommand {
  constructor(
    public readonly publicId: string,
    public readonly isActive: boolean,
  ) {}
}
