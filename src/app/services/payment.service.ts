import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly paymentsUrl = `${environment.apiUrl}/mercadopago/payments`;

  constructor(private readonly http: HttpClient) {}

  createPayment(payload: CreatePaymentPayload): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(this.paymentsUrl, payload);
  }
}
