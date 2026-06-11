import { Injectable } from '@angular/core';
import { CheckoutOrder } from '../models/order.model';

const STORAGE_KEY = 'pendingOrder';

@Injectable({
  providedIn: 'root',
})
export class CheckoutStateService {
  save(order: CheckoutOrder): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }

  get(): CheckoutOrder | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CheckoutOrder;
    } catch {
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  isExpired(order: CheckoutOrder | null): boolean {
    if (!order?.expires_at) {
      return false;
    }
    return new Date(order.expires_at).getTime() < Date.now();
  }
}
