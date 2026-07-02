import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SupplierApprovedEvent } from '../../../supplier/identity/domain/events/supplier-approved.event';
import { SupplierRejectedEvent } from '../../../supplier/identity/domain/events/supplier-rejected.event';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { NotificationType } from '../../domain/notification.types';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

type SupplierEvent = SupplierApprovedEvent | SupplierRejectedEvent;

@EventsHandler(SupplierApprovedEvent, SupplierRejectedEvent)
export class SupplierNotificationsListener implements IEventHandler<SupplierEvent> {
  private readonly logger = new Logger(SupplierNotificationsListener.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async handle(event: SupplierEvent): Promise<void> {
    try {
      await this.dispatch(event);
    } catch (err) {
      this.logger.error(
        `SupplierNotificationsListener failed for ${event.constructor.name}`,
        err,
      );
    }
  }

  private async dispatch(event: SupplierEvent): Promise<void> {
    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'https://app.asasgate.net';

    if (event instanceof SupplierApprovedEvent) {
      const user = await this.userRepo.findOne({ where: { id: event.userId } });

      await this.createInApp(event.userId, NotificationType.SUPPLIER_APPROVED, {
        supplierId: event.supplierId,
        companyName: event.companyName,
      });

      await this.sendApprovalEmail(user?.email, {
        subject: 'Your supplier account has been approved',
        recipientName: user?.name ?? 'Supplier',
        statusMessage:
          'Congratulations! Your supplier account has been approved. You can now start listing products.',
        deepLink: `${appUrl}/dashboard`,
        ctaLabel: 'Go to Dashboard',
      });
    } else if (event instanceof SupplierRejectedEvent) {
      const user = await this.userRepo.findOne({ where: { id: event.userId } });

      await this.createInApp(event.userId, NotificationType.SUPPLIER_REJECTED, {
        supplierId: event.supplierId,
        companyName: event.companyName,
        reason: event.reason,
      });

      await this.sendApprovalEmail(user?.email, {
        subject: 'Your supplier account application was not approved',
        recipientName: user?.name ?? 'Supplier',
        statusMessage:
          'Unfortunately, your supplier account application was not approved at this time.',
        deepLink: `${appUrl}/dashboard`,
        ctaLabel: 'View Details',
        reason: event.reason,
      });
    }
  }

  private async createInApp(
    userId: number,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.commandBus.execute(
        new CreateNotificationCommand(userId, type, payload),
      );
    } catch (err) {
      this.logger.error(
        `Failed to create in-app notification for user ${userId}`,
        err,
      );
    }
  }

  private async sendApprovalEmail(
    email: string | undefined | null,
    data: Parameters<EmailService['sendApprovalDecisionEmail']>[1],
  ): Promise<void> {
    if (!email) return;
    try {
      await this.emailService.sendApprovalDecisionEmail(email, data);
    } catch (err) {
      this.logger.error(
        `Failed to send approval decision email to ${email}`,
        err,
      );
    }
  }
}
