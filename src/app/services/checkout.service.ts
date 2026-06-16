import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthenticatedCheckoutPayload,
  ClaimGuestSessionResponse,
  GuestCheckoutPayload,
  GuestCheckoutResponse,
  UpdateCheckoutDeliveryPayload,
} from '../models/checkout.model';
import { CheckoutOrder } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly checkoutUrl = `${environment.apiUrl}/orders/checkout`;
  private readonly guestCheckoutUrl = `${environment.apiUrl}/orders/guest-checkout`;

  constructor(private readonly http: HttpClient) {}

  startCheckout(payload: AuthenticatedCheckoutPayload): Observable<CheckoutOrder> {
    return this.http.post<CheckoutOrder>(this.checkoutUrl, payload);
  }

  guestCheckout(payload: GuestCheckoutPayload): Observable<GuestCheckoutResponse> {
    return this.http.post<GuestCheckoutResponse>(this.guestCheckoutUrl, payload);
  }

  claimGuestSession(orderId: number): Observable<ClaimGuestSessionResponse> {
    return this.http.post<ClaimGuestSessionResponse>(
      `${environment.apiUrl}/orders/${orderId}/claim-session`,
      {},
    );
  }

  updateCheckoutDelivery(
    orderId: number,
    payload: UpdateCheckoutDeliveryPayload,
  ): Observable<CheckoutOrder> {
    return this.http.patch<CheckoutOrder>(
      `${environment.apiUrl}/orders/${orderId}/checkout-delivery`,
      payload,
    );
  }
}
