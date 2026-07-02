import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateManualClientCommand } from '../create-manual-client.command';
import { ManualClient } from '../../../domain/manual-client.entity';
import type { IManualClientRepository } from '../../../domain/manual-client.repository.interface';
import { MANUAL_CLIENT_REPOSITORY } from '../../../domain/manual-client.repository.interface';
import { ClientSegmentVo } from '../../../domain/value-objects/client-segment.vo';
import { DuplicateClientEmailException } from '../../../domain/client.exceptions';
import { ManualClientMapper } from '../../../infrastructure/mappers/manual-client.mapper';

@CommandHandler(CreateManualClientCommand)
export class CreateManualClientHandler implements ICommandHandler<CreateManualClientCommand> {
  constructor(
    @Inject(MANUAL_CLIENT_REPOSITORY)
    private readonly manualClientRepo: IManualClientRepository,
  ) {}

  async execute(command: CreateManualClientCommand) {
    const { supplierId, input } = command;

    const exists = await this.manualClientRepo.existsBySupplierAndEmail(
      supplierId,
      input.email,
    );
    if (exists) throw new DuplicateClientEmailException(input.email);

    const manualClient = ManualClient.create({
      supplierId,
      companyName: input.companyName,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      classification: ClientSegmentVo.toClassification(input.segment),
      creditLimitSar: input.creditLimitSar,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
    });

    const saved = await this.manualClientRepo.save(manualClient);
    return { client: ManualClientMapper.toReadRow(saved) };
  }
}
