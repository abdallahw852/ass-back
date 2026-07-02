import { Injectable } from '@nestjs/common';
import { type ICommand, ofType, Saga } from '@nestjs/cqrs';
import { filter, map, type Observable } from 'rxjs';
import { OrderPaidEvent } from '../../../order/domain/events/order-paid.event';
import { OrderCancelledEvent } from '../../../order/domain/events/order-cancelled.event';
import { RequestPlatformShipmentCommand } from '../commands/request-platform-shipment.command';
import { CancelPlatformShipmentCommand } from '../commands/cancel-platform-shipment.command';

@Injectable()
export class PlatformShippingSaga {
  @Saga()
  orderPaid = (events$: Observable<unknown>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderPaidEvent),
      filter((event) => event.shippingMethod === 'platform'),
      map((event) => new RequestPlatformShipmentCommand(event.orderId)),
    );
  };

  @Saga()
  orderCancelled = (events$: Observable<unknown>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCancelledEvent),
      filter((event) => event.shippingMethod === 'platform'),
      map((event) => new CancelPlatformShipmentCommand(event.orderId)),
    );
  };
}
