import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PaymentResponse } from '../models/order.model';

export interface CreatePaymentPayload {
  transaction_amount: number;
  token: string;
  installments: number;
  issuer_id?: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  order_id: number;
}

export interface OrderPaymentStatus {
  order_id: number;
  status: string;
  payment_id?: string | null;
  expires_at?: string | null;
}

const PENDING_PAYMENT_STATUSES = new Set(['pending', 'in_process', 'authorized']);

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly paymentsUrl = `${environment.apiUrl}/mercadopago/payments`;

  constructor(private readonly http: HttpClient) {}

  createPayment(payload: CreatePaymentPayload): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(this.paymentsUrl, payload);
  }

  getOrderPaymentStatus(orderId: number): Observable<OrderPaymentStatus> {
    return this.http.get<OrderPaymentStatus>(
      `${environment.apiUrl}/mercadopago/orders/${orderId}/payment-status`,
    );
  }

  waitForOrderResolution(
    orderId: number,
    options: { intervalMs?: number; maxAttempts?: number } = {},
  ): Observable<OrderPaymentStatus> {
    const intervalMs = options.intervalMs ?? 5000;
    const maxAttempts = options.maxAttempts ?? 24;

    return timer(0, intervalMs).pipe(
      take(maxAttempts),
      switchMap(() => this.getOrderPaymentStatus(orderId)),
      filter((status) => status.status !== 'PENDIENTE_PAGO'),
      take(1),
    );
  }

  isPendingMercadoPagoStatus(status: string): boolean {
    return PENDING_PAYMENT_STATUSES.has(status);
  }
}
