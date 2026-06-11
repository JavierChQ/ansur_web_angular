import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CheckoutOrder } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly checkoutUrl = `${environment.apiUrl}/orders/checkout`;

  constructor(private readonly http: HttpClient) {}

  startCheckout(id_address: number): Observable<CheckoutOrder> {
    return this.http.post<CheckoutOrder>(this.checkoutUrl, { id_address });
  }
}
