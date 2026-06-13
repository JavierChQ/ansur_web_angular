import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CheckoutStateService } from './services/checkout-state.service';

@Injectable({
  providedIn: 'root',
})
export class CheckoutOrderGuard implements CanActivate {
  constructor(
    private readonly checkoutState: CheckoutStateService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean {
    const order = this.checkoutState.getOrder();
    if (order && !this.checkoutState.isExpired(order)) {
      return true;
    }

    this.router.navigate(['/cart']);
    return false;
  }
}
