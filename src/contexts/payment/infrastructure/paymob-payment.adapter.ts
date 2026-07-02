import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  CreatePaymobIntentionResult,
  CreateSubscriptionPlanParams,
  CreateSubscriptionPlanResult,
  UpdateSubscriptionPlanParams,
  PaymentWebhookEvent,
  PaymentGatewayPort,
} from '../application/ports/payment-gateway.port';

const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'obj.id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

interface PaymobTokenResponse {
  profile_id: number;
  token: string;
}

interface PaymobOrderResponse {
  id: number;
  created_at: string;
  amount_cents: number;
  currency: string;
  merchant_order_id: string;
}

interface PaymobPaymentKeyResponse {
  token: string;
}

interface PaymobTransactionCallback {
  type: string;
  obj: {
    id: number;
    pending: boolean;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_3d_secure: boolean;
    integration_id: number;
    has_parent_transaction: boolean;
    order: {
      id: number;
      merchant_order_id: string | null;
    };
    created_at: string;
    currency: string;
    source_data: {
      pan: string;
      type: string;
      sub_type: string;
    };
    error_occured: boolean;
    owner: number;
  };
}

interface CreatePaymobSubscriptionPlanParams {
  frequency: number;
  name: string;
  webhook_url: string;
  reminder_days: number;
  retrial_days: number;
  number_of_deductions: number;
  amount_cents: number;
  use_transaction_amount: boolean;
  is_active: boolean;
  integration: number;
  fee: string;
}

interface CreatePaymobSubscriptionPlanResponse {
  id: number;
  frequency: number;
  created_at: string;
  updated_at: string;
  name: string;
  reminder_days: string;
  retrial_days: string;
  plan_type: string;
  number_of_deductions: string;
  amount_cents: number;
  use_transaction_amount: boolean;
  is_active: boolean;
  webhook_url: string;
  integration: number;
  fee: string;
}

@Injectable()
export class PaymobPaymentAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(PaymobPaymentAdapter.name);
  private readonly secretKey: string;
  private readonly apiKey: string;
  private readonly hmacSecret: string;
  private readonly integrationIds: number[];
  private readonly motoIntegrationId: number;
  private readonly baseUrl: string;
  private readonly subscriptionWebhookUrl: string;
  private readonly notificationUrl: string;
  private readonly redirectionUrl: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYMOB_SECRET_KEY') || '';
    this.apiKey = this.configService.get<string>('PAYMOB_API_KEY') || '';
    this.hmacSecret =
      this.configService.get<string>('PAYMOB_HMAC_SECRET') || '';
    this.integrationIds = (
      this.configService.get<string>('PAYMOB_INTEGRATION_ID') || ''
    )
      .split(',')
      .map((id) => Number(id.trim()))
      .filter(Boolean);
    this.motoIntegrationId = Number(
      this.configService.get<string>('PAYMOB_MOTO_INTEGRATION_ID') ||
        this.integrationIds[0],
    );
    this.baseUrl =
      this.configService.get<string>('PAYMOB_BASE_URL') ||
      'https://ksa.paymob.com';
    this.subscriptionWebhookUrl =
      this.configService.get<string>('PAYMOB_SUBSCRIPTION_WEBHOOK_URL') ||
      this.configService.get<string>('PAYMOB_WEBHOOK_URL') ||
      '';
    this.notificationUrl =
      this.configService.get<string>('PAYMOB_NOTIFICATION_URL') ||
      this.configService.get<string>('PAYMOB_WEBHOOK_URL') ||
      '';
    this.redirectionUrl =
      this.configService.get<string>('PAYMOB_REDIRECTION_URL') || '';

    if (
      !this.apiKey ||
      !this.hmacSecret ||
      !this.integrationIds.length ||
      !this.secretKey
    ) {
      this.logger.warn(
        'Paymob credentials are not fully configured. Payment features will not work.',
      );
    }

    if (!this.subscriptionWebhookUrl) {
      this.logger.warn(
        'Paymob subscription webhook URL is not configured. Subscription plan creation will not work.',
      );
    }
  }

  async createPaymentIntention(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const billing = params.billingData;

    const response = await fetch(`${this.baseUrl}/v1/intention/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.secretKey}`,
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency.toUpperCase(),
        payment_methods: this.integrationIds,
        items: [
          {
            name: 'Subscription',
            amount: params.amountCents,
            description: 'Subscription payment',
            quantity: 1,
          },
        ],
        billing_data: {
          apartment: 'NA',
          first_name: billing?.firstName || 'NA',
          last_name: billing?.lastName || 'NA',
          street: 'NA',
          building: 'NA',
          phone_number: billing?.phone || 'NA',
          city: 'NA',
          country: 'SA',
          email: billing?.email || 'na@example.com',
          floor: 'NA',
          state: 'NA',
        },
        extras: {},
        special_reference: params.merchantOrderId,
        expiration: 3600,
        notification_url: this.notificationUrl,
        redirection_url: this.redirectionUrl,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Paymob intention creation failed: ${response.status} ${text}`,
      );
    }

    const result = (await response.json()) as CreatePaymobIntentionResult;
    return {
      paymentIntentId: result.id,
      clientSecret: result.client_secret,
    };
  }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const token = await this.authenticate();

    const order = await this.createOrder(token, params);

    const paymentToken = await this.createPaymentKey(token, params, order);

    return {
      paymentIntentId: String(order.id),
      clientSecret: paymentToken,
    };
  }

  async createSubscriptionPlan(
    params: CreateSubscriptionPlanParams,
  ): Promise<CreateSubscriptionPlanResult> {
    if (!this.subscriptionWebhookUrl) {
      throw new Error('Paymob subscription webhook URL is not configured.');
    }

    const token = await this.authenticate();
    const subscriptionPlan = await this.requestSubscriptionPlan(token, {
      amount_cents: params.amountCents,
      fee: '',
      frequency: this.mapBillingCycleToFrequency(params.billingCycle),
      integration: this.motoIntegrationId,
      is_active: params.isActive,
      name: params.name,
      number_of_deductions: this.getNumberOfDeductions(),
      reminder_days: this.getReminderDays(),
      retrial_days: this.getRetrialDays(),
      use_transaction_amount: false,
      webhook_url: this.subscriptionWebhookUrl,
    });

    return {
      planId: String(subscriptionPlan.id),
    };
  }

  async updateSubscriptionPlan(
    params: UpdateSubscriptionPlanParams,
  ): Promise<void> {
    const token = await this.authenticate();
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body['name'] = params.name;
    if (params.isActive !== undefined) body['is_active'] = params.isActive;

    // TODO: Confirm exact verb (PATCH vs PUT) against live Paymob Postman collection
    const response = await fetch(
      `${this.baseUrl}/api/acceptance/subscription-plans/${params.platformPlanId}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Paymob subscription plan update failed: ${response.status} ${text}`,
      );
    }
  }

  async deactivateSubscriptionPlan(platformPlanId: string): Promise<void> {
    await this.updateSubscriptionPlan({ platformPlanId, isActive: false });
  }

  verifyAndParseWebhook(body: unknown, hmac: string): PaymentWebhookEvent {
    const callback = body as PaymobTransactionCallback;

    if (!callback || callback.type !== 'TRANSACTION' || !callback.obj) {
      throw new Error('Invalid webhook payload: unexpected structure.');
    }

    const calculatedHmac = this.calculateHmac(callback.obj);
    const aBuf = Buffer.from(calculatedHmac, 'utf8');
    const bBuf = Buffer.from(hmac, 'utf8');
    if (aBuf.length !== bBuf.length || !timingSafeEqual(aBuf, bBuf)) {
      throw new Error('HMAC verification failed.');
    }

    return {
      type: callback.obj.success
        ? 'succeeded'
        : callback.obj.error_occured
          ? 'failed'
          : 'unknown',
      transactionId: String(callback.obj.id),
      orderId: String(callback.obj.order.id),
      merchantOrderId: callback.obj.order.merchant_order_id,
      amountCents: callback.obj.amount_cents,
      currency: callback.obj.currency,
      success: callback.obj.success,
    };
  }

  private async authenticate(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.baseUrl}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    });

    if (!response.ok) {
      throw new Error(
        `Paymob authentication failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as PaymobTokenResponse;

    this.cachedToken = data.token;
    this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;

    return this.cachedToken;
  }

  private async createOrder(
    token: string,
    params: CreatePaymentParams,
  ): Promise<PaymobOrderResponse> {
    const response = await fetch(`${this.baseUrl}/api/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: params.amountCents,
        currency: params.currency.toUpperCase(),
        merchant_order_id: params.merchantOrderId,
        items: [],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Paymob order creation failed: ${response.status} ${text}`,
      );
    }

    return (await response.json()) as PaymobOrderResponse;
  }

  private async createPaymentKey(
    token: string,
    params: CreatePaymentParams,
    order: PaymobOrderResponse,
  ): Promise<string> {
    const billing = params.billingData;

    const response = await fetch(
      `${this.baseUrl}/api/acceptance/payment_keys`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          auth_token: token,
          amount_cents: params.amountCents,
          expiration: 3600,
          order_id: order.id,
          billing_data: {
            first_name: billing?.firstName || 'NA',
            last_name: billing?.lastName || 'NA',
            email: billing?.email || 'na@example.com',
            phone_number: billing?.phone || 'NA',
            street: 'NA',
            building: 'NA',
            floor: 'NA',
            apartment: 'NA',
            city: 'NA',
            country: 'SA',
            state: 'NA',
            postal_code: 'NA',
          },
          currency: params.currency.toUpperCase(),
          integration_id: this.integrationIds[0],
          lock_order_when_paid: false,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Paymob payment key creation failed: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as PaymobPaymentKeyResponse;
    return data.token;
  }

  private async requestSubscriptionPlan(
    token: string,
    payload: CreatePaymobSubscriptionPlanParams,
  ): Promise<CreatePaymobSubscriptionPlanResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/acceptance/subscription-plans`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          plan_type: 'rent',
        }),
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Paymob subscription plan creation failed: ${response.status} ${text}`,
      );
    }
    return (await response.json()) as CreatePaymobSubscriptionPlanResponse;
  }

  private mapBillingCycleToFrequency(billingCycle: string): number {
    switch (billingCycle) {
      case 'monthly':
        return 30;
      case 'yearly':
        return 360;
      default:
        throw new Error(`Unsupported Paymob billing cycle: ${billingCycle}`);
    }
  }

  private getReminderDays(): number {
    return Number(
      this.configService.get<string>('PAYMOB_SUBSCRIPTION_REMINDER_DAYS') || 1,
    );
  }

  private getRetrialDays(): number {
    return Number(
      this.configService.get<string>('PAYMOB_SUBSCRIPTION_RETRIAL_DAYS') || 1,
    );
  }

  private getNumberOfDeductions(): number {
    return Number(
      this.configService.get<string>(
        'PAYMOB_SUBSCRIPTION_NUMBER_OF_DEDUCTIONS',
      ) || 9999,
    );
  }

  async refund(params: {
    providerRef: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<{ refundId: string; success: boolean }> {
    const apiKey = this.configService.get<string>('PAYMOB_API_KEY');
    const refundEnabled =
      this.configService.get<string>('PAYMOB_REFUND_ENABLED') !== 'false';

    if (!refundEnabled || !apiKey) {
      return { refundId: `mock_refund_${Date.now()}`, success: true };
    }

    const resp = await fetch(
      'https://accept.paymob.com/api/acceptance/void_refund/refund',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': params.idempotencyKey,
        },
        body: JSON.stringify({
          api_key: apiKey,
          transaction_id: params.providerRef,
          amount_cents: params.amountCents,
        }),
      },
    );

    const body = (await resp.json()) as { id?: number; success?: boolean };
    return {
      refundId: String(body.id ?? 'unknown'),
      success: body.success === true,
    };
  }

  private calculateHmac(obj: PaymobTransactionCallback['obj']): string {
    const values: Record<string, string> = {
      amount_cents: String(obj.amount_cents),
      created_at: obj.created_at,
      currency: obj.currency,
      error_occured: String(obj.error_occured),
      has_parent_transaction: String(obj.has_parent_transaction),
      'obj.id': String(obj.id),
      integration_id: String(obj.integration_id),
      is_3d_secure: String(obj.is_3d_secure),
      is_auth: String(obj.is_auth),
      is_capture: String(obj.is_capture),
      is_refunded: String(obj.is_refunded),
      is_standalone_payment: String(obj.is_standalone_payment),
      is_voided: String(obj.is_voided),
      'order.id': String(obj.order.id),
      owner: String(obj.owner),
      pending: String(obj.pending),
      'source_data.pan': obj.source_data?.pan || '',
      'source_data.sub_type': obj.source_data?.sub_type || '',
      'source_data.type': obj.source_data?.type || '',
      success: String(obj.success),
    };

    const concatenated = HMAC_FIELDS.map((field) => values[field]).join('');

    return createHmac('sha512', this.hmacSecret)
      .update(concatenated)
      .digest('hex');
  }
}
