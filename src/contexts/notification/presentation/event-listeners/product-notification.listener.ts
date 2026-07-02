import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProductApprovedEvent } from '../../../product/domain/events/product-approved.event';
import { ProductRejectedEvent } from '../../../product/domain/events/product-rejected.event';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { NotificationType } from '../../domain/notification.types';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';

type ProductEvent = ProductApprovedEvent | ProductRejectedEvent;

@EventsHandler(ProductApprovedEvent, ProductRejectedEvent)
export class ProductNotificationsListener implements IEventHandler<ProductEvent> {
  private readonly logger = new Logger(ProductNotificationsListener.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(SupplierOrmEntity, 'write')
    private readonly supplierRepo: Repository<SupplierOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async handle(event: ProductEvent): Promise<void> {
    try {
      await this.dispatch(event);
    } catch (err) {
      this.logger.error(
        `ProductNotificationsListener failed for ${event.constructor.name}`,
        err,
      );
    }
  }

  private async dispatch(event: ProductEvent): Promise<void> {
    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'https://app.asasgate.net';

    const supplier = await this.supplierRepo.findOne({
      where: { id: event.supplierId },
    });
    if (!supplier) return;

    const user = await this.userRepo.findOne({
      where: { id: supplier.userId },
    });

    if (event instanceof ProductApprovedEvent) {
      await this.createInApp(
        supplier.userId,
        NotificationType.PRODUCT_APPROVED,
        {
          productId: event.productId,
          productName: event.productName,
        },
      );

      await this.sendApprovalEmail(user?.email, {
        subject: `Your product "${event.productName}" has been approved`,
        recipientName: user?.name ?? 'Supplier',
        statusMessage: `Congratulations! Your product "${event.productName}" has been approved and is now live on the marketplace.`,
        deepLink: `${appUrl}/products/${event.productId}`,
        ctaLabel: 'View Product',
      });
    } else if (event instanceof ProductRejectedEvent) {
      await this.createInApp(
        supplier.userId,
        NotificationType.PRODUCT_REJECTED,
        {
          productId: event.productId,
          productName: event.productName,
          reason: event.reason,
        },
      );

      await this.sendApprovalEmail(user?.email, {
        subject: `Your product "${event.productName}" was not approved`,
        recipientName: user?.name ?? 'Supplier',
        statusMessage: `Unfortunately, your product "${event.productName}" was not approved at this time.`,
        deepLink: `${appUrl}/products/${event.productId}`,
        ctaLabel: 'View Product',
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
        `Failed to send product approval email to ${email}`,
        err,
      );
    }
  }
}
