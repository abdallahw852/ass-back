import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { OpenConversationCommand } from '../../../../messaging/application/commands/open-conversation.command';
import {
  ConversationSubjectType,
  ParticipantRole,
} from '../../../../messaging/domain/conversation.types';
import type { ConversationOrmEntity } from '../../../../messaging/infrastructure/persistence/conversation.orm-entity';
import { SUPPLIER_REPOSITORY } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../../supplier/identity/domain/repositories/supplier.repository.interface';
import { RFQ_REPOSITORY } from '../../../domain/rfq.repository.interface';
import type { IRfqRepository } from '../../../domain/rfq.repository.interface';
import {
  InvalidDirectedRfqSupplierException,
  RfqAccessDeniedException,
  RfqNotFoundException,
  SupplierNotFoundException,
} from '../../../domain/rfq.exceptions';
import { RfqType } from '../../../domain/rfq.types';
import {
  OpenRfqConversationAsBuyerCommand,
  OpenRfqConversationAsSupplierCommand,
} from '../open-rfq-conversation.command';

type OpenConversationResult = { conversation: ConversationOrmEntity };

@CommandHandler(OpenRfqConversationAsBuyerCommand)
export class OpenRfqConversationAsBuyerHandler implements ICommandHandler<OpenRfqConversationAsBuyerCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: OpenRfqConversationAsBuyerCommand,
  ): Promise<{ conversationId: string }> {
    const rfq = await this.rfqRepository.findByPublicId(command.rfqPublicId);
    if (!rfq) {
      throw new RfqNotFoundException(command.rfqPublicId);
    }
    if (rfq.buyerId !== command.buyerUserId) {
      throw new RfqAccessDeniedException();
    }

    const supplier = await this.supplierRepository.findByPublicId(
      command.supplierPublicId,
    );
    if (!supplier) {
      throw new SupplierNotFoundException();
    }

    if (
      rfq.type === RfqType.PRODUCT_DIRECTED &&
      rfq.targetSupplierId !== supplier.id
    ) {
      throw new InvalidDirectedRfqSupplierException();
    }

    const result = await this.commandBus.execute<
      OpenConversationCommand,
      OpenConversationResult
    >(
      new OpenConversationCommand(
        ConversationSubjectType.RFQ,
        rfq._id,
        supplier._id,
        [
          { userId: command.buyerUserId, role: ParticipantRole.BUYER },
          { userId: supplier.userId, role: ParticipantRole.SUPPLIER },
        ],
      ),
    );

    return { conversationId: result.conversation._id };
  }
}

@CommandHandler(OpenRfqConversationAsSupplierCommand)
export class OpenRfqConversationAsSupplierHandler implements ICommandHandler<OpenRfqConversationAsSupplierCommand> {
  constructor(
    @Inject(RFQ_REPOSITORY)
    private readonly rfqRepository: IRfqRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: OpenRfqConversationAsSupplierCommand,
  ): Promise<{ conversationId: string }> {
    const supplier = await this.supplierRepository.findByUserId(
      command.supplierUserId,
    );
    if (!supplier) {
      throw new SupplierNotFoundException();
    }

    const rfq = await this.rfqRepository.findByPublicId(command.rfqPublicId);
    if (!rfq) {
      throw new RfqNotFoundException(command.rfqPublicId);
    }

    if (
      rfq.type === RfqType.PRODUCT_DIRECTED &&
      rfq.targetSupplierId !== supplier.id
    ) {
      throw new InvalidDirectedRfqSupplierException();
    }

    const result = await this.commandBus.execute<
      OpenConversationCommand,
      OpenConversationResult
    >(
      new OpenConversationCommand(
        ConversationSubjectType.RFQ,
        rfq._id,
        supplier._id,
        [
          { userId: rfq.buyerId, role: ParticipantRole.BUYER },
          { userId: supplier.userId, role: ParticipantRole.SUPPLIER },
        ],
      ),
    );

    return { conversationId: result.conversation._id };
  }
}
