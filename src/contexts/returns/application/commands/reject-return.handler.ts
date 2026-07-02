import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RejectReturnCommand } from './reject-return.command';
import { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';
import {
  InvalidReturnStatusTransitionException,
  ReturnRequestAccessDeniedException,
  ReturnRequestNotFoundException,
} from '../../domain/returns.exceptions';
import type { ReturnRequestReadModel } from '../queries/list-return-requests.handler';
import { fetchReturnRequestReadModel } from '../return-request-read.util';

@CommandHandler(RejectReturnCommand)
export class RejectReturnHandler implements ICommandHandler<
  RejectReturnCommand,
  ReturnRequestReadModel
> {
  constructor(
    @InjectRepository(ReturnRequestOrmEntity, 'write')
    private readonly returnRequestRepo: Repository<ReturnRequestOrmEntity>,
  ) {}

  async execute(command: RejectReturnCommand): Promise<ReturnRequestReadModel> {
    const entity = await this.returnRequestRepo.findOne({
      where: { _id: command.returnId },
    });
    if (!entity) throw new ReturnRequestNotFoundException();
    if (entity.supplier_id !== command.supplierId) {
      throw new ReturnRequestAccessDeniedException();
    }
    if (entity.status !== 'pending') {
      throw new InvalidReturnStatusTransitionException(
        command.returnId,
        entity.status,
        'reject',
      );
    }

    entity.status = 'rejected';
    entity.rejection_reason = command.reason ?? null;
    entity.reviewed_by_id = command.reviewerId;
    entity.reviewed_at = new Date();

    await this.returnRequestRepo.save(entity);

    return fetchReturnRequestReadModel(this.returnRequestRepo, entity._id);
  }
}
