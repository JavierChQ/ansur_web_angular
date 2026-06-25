import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WhatsappPaymentIntentResponse {
  order_id: number;
  reference_code: string;
  amount: number;
  expires_at: string;
  payment_channel: string;
  whatsapp_intent_at: string;
  message: string;
  whatsapp_url: string;
}

export interface ResetMercadoPagoCheckoutResponse {
  order_id: number;
  expires_at: string;
  payment_channel: null;
}

@Injectable({
  providedIn: 'root',
})
export class WhatsappPaymentService {
  constructor(private readonly http: HttpClient) {}

  registerIntent(orderId: number): Observable<WhatsappPaymentIntentResponse> {
    return this.http.post<WhatsappPaymentIntentResponse>(
      `${environment.apiUrl}/orders/${orderId}/whatsapp-payment-intent`,
      {},
    );
  }

  resetMercadoPagoCheckout(orderId: number): Observable<ResetMercadoPagoCheckoutResponse> {
    return this.http.post<ResetMercadoPagoCheckoutResponse>(
      `${environment.apiUrl}/orders/${orderId}/reset-mercadopago-checkout`,
      {},
    );
  }
}
