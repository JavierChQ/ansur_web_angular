import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartCountSubject = new BehaviorSubject<number>(this.getCartItemCount());
  cartCount$ = this.cartCountSubject.asObservable();

  updateCartCount(): void {
    this.cartCountSubject.next(this.getCartItemCount());
  }

  private getCartItemCount(): number {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(cart)
      ? cart.reduce((count: number, item: any) => count + (item.quantity || 0), 0)
      : 0;
  }
}
