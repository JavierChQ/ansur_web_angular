import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cart } from '../models/cart.model';

@Injectable({
  providedIn: 'root',
})
export class CartApiService {
  private readonly cartUrl = `${environment.apiUrl}/cart`;

  constructor(private readonly http: HttpClient) {}

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.cartUrl);
  }

  addOrUpdateItem(id_product: number, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.cartUrl}/items`, { id_product, quantity });
  }

  removeItem(productId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.cartUrl}/items/${productId}`);
  }
}
