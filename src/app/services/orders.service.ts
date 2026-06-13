import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  constructor(private readonly http: HttpClient) {}

  getMyOrders(): Observable<Order[]> {
    const userId = localStorage.getItem('id');
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    return this.http.get<Order[]>(`${this.ordersUrl}/${userId}`);
  }
}
