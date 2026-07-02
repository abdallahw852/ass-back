export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface CreatePaymentParams {
  amountCents: number;
  currency: string;
  merchantOrderId: string;
  billingData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface CreatePaymobIntentionParams extends CreatePaymentParams {
  amount: number;
  currency: string;
  payment_methods: number[];
  items: {
    name: string;
    amount: number;
    description: string;
    quantity: number;
  }[];
  billing_data: {
    apartment: string;
    first_name: string;
    last_name: string;
    street: string;
    building: string;
    phone_number: string;
    city: string;
    country: string;
    email: string;
    floor: string;
    state: string;
  };
  extras: Record<string, unknown>;
  special_reference: string;
  expiration: number;
  notification_url: string;
  redirection_url: string;
}

export interface CreatePaymobIntentionResult {
  payment_keys: PaymentKey[];
  intention_order_id: number;
  id: string;
  intention_detail: IntentionDetail;
  client_secret: string;
  payment_methods: PaymentMethod[];
  special_reference: string;
  extras: Extras;
  confirmed: boolean;
  status: string;
  created: string;
  card_detail: null;
  card_tokens: unknown[];
  object: string;
}

interface PaymentKey {
  integration: number;
  key: string;
  gateway_type: string;
  iframe_id: null;
  order_id: number;
}

interface IntentionDetail {
  amount: number;
  items: IntentionItem[];
  currency: string;
  billing_data: BillingData;
}

interface IntentionItem {
  name: string;
  amount: number;
  description: string;
  quantity: number;
  image: null;
}

interface BillingData {
  apartment: string;
  floor: string;
  first_name: string;
  last_name: string;
  street: string;
  building: string;
  phone_number: string;
  shipping_method: string;
  city: string;
  country: string;
  state: string;
  email: string;
  postal_code: string;
}

interface PaymentMethod {
  integration_id: number;
  alias: null;
  name: string;
  method_type: string;
  currency: string;
  live: boolean;
  use_cvc_with_moto: boolean;
}

interface Extras {
  creation_extras: Record<string, unknown>;
  confirmation_extras: null;
}

export interface CreatePaymentResult {
  paymentIntentId: string;
  clientSecret: string;
}

export interface CreateSubscriptionPlanParams {
  amountCents: number;
  billingCycle: string;
  currency: string;
  fee: string;
  isActive: boolean;
  name: string;
}

export interface CreateSubscriptionPlanResult {
  planId: string;
}

export interface UpdateSubscriptionPlanParams {
  platformPlanId: string;
  name?: string;
  isActive?: boolean;
}

export interface PaymentWebhookEvent {
  type: 'succeeded' | 'failed' | 'unknown';
  transactionId: string;
  orderId: string;
  merchantOrderId: string | null;
  amountCents: number;
  currency: string;
  success: boolean;
}

export interface RefundParams {
  providerRef: string;
  amountCents: number;
  idempotencyKey: string;
}

export interface RefundResult {
  refundId: string;
  success: boolean;
}

export interface PaymentGatewayPort {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  createPaymentIntention(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult>;
  createSubscriptionPlan(
    params: CreateSubscriptionPlanParams,
  ): Promise<CreateSubscriptionPlanResult>;
  updateSubscriptionPlan(params: UpdateSubscriptionPlanParams): Promise<void>;
  deactivateSubscriptionPlan(platformPlanId: string): Promise<void>;
  verifyAndParseWebhook(body: unknown, hmac: string): PaymentWebhookEvent;
  refund(params: RefundParams): Promise<RefundResult>;
}
