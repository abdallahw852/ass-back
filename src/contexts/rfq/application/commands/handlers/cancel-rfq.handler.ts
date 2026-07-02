import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import {
  RfqAccessDeniedException,
  RfqClosedException,
  RfqNotFoundException,
} from '../../../domain/rfq.exceptions';
import { RfqStatus } from '../../../domain/rfq.types';
import { CancelRfqCommand } from '../cancel-rfq.command';

@CommandHandler(CancelRfqCommand)
export class CancelRfqHandler implements ICommandHandler<CancelRfqCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
  ) {}

  async execute(command: CancelRfqCommand): Promise<Record<string, unknown>> {
    const rfq = await this.rfqRepository.findByPublicId(command.rfqId);
    if (!rfq) {
      throw new RfqNotFoundException(command.rfqId);
    }

    if (rfq.buyerId !== command.buyerId) {
      throw new RfqAccessDeniedException();
    }

    if (rfq.status !== RfqStatus.OPEN) {
      throw new RfqClosedException();
    }

    const saved = await this.rfqRepository.update(rfq.id, {
      status: RfqStatus.CANCELLED,
    });

    return { rfq: saved };
  }
}
