import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListNotificationsQuery } from '../list-notifications.query';
import { NOTIFICATION_REPOSITORY } from '../../../domain/notification.repository.interface';
import type { INotificationRepository } from '../../../domain/notification.repository.interface';

@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<ListNotificationsQuery> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(query: ListNotificationsQuery) {
    return this.notificationRepo.findByUser(
      query.userId,
      query.limit,
      query.offset,
    );
  }
}
