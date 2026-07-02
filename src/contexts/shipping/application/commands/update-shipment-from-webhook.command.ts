export interface TorodWebhookPayload {
  order_id: string;
  tracking_id: string | null;
  status: string;
  shipment_status: string | null;
  courier_name: string | null;
  courier_status: string | null;
  date_time: string;
  description: string | null;
  torod_description: string | null;
  torod_description_ar: string | null;
  torod_shipment_tracking_url: string | null;
  aws_label: string | null;
}

export class UpdateShipmentFromWebhookCommand {
  constructor(public readonly payload: TorodWebhookPayload) {}
}
