import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundReturnCommand } from './refund-return.command';
import { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';
import {
  InvalidReturnStatusTransitionException,
  ReturnRequestAccessDeniedException,
  ReturnRequestNotFoundException,
} from '../../domain/returns.exceptions';
import type { ReturnRequestReadModel } from '../queries/list-return-requests.handler';
import { fetchReturnRequestReadModel } from '../return-request-read.util';

@CommandHandler(RefundReturnCommand)
export class RefundReturnHandler implements ICommandHandler<
  RefundReturnCommand,
  ReturnRequestReadModel
> {
  constructor(
    @InjectRepository(ReturnRequestOrmEntity, 'write')
    private readonly returnRequestRepo: Repository<ReturnRequestOrmEntity>,
  ) {}

  async execute(command: RefundReturnCommand): Promise<ReturnRequestReadModel> {
    const entity = await this.returnRequestRepo.findOne({
      where: { _id: command.returnId },
    });
    if (!entity) throw new ReturnRequestNotFoundException();
    if (entity.supplier_id !== command.supplierId) {
      throw new ReturnRequestAccessDeniedException();
    }
    if (entity.status !== 'approved') {
      throw new InvalidReturnStatusTransitionException(
        command.returnId,
        entity.status,
        'refund',
      );
    }

    entity.status = 'refunded';
    entity.refund_amount = command.amount ?? Number(entity.total_amount);
    entity.refunded_at = new Date();

    await this.returnRequestRepo.save(entity);

    return fetchReturnRequestReadModel(this.returnRequestRepo, entity._id);
  }
}
