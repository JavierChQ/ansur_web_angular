import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root',
})
export class CartGuard implements CanActivate {
  constructor(
    private readonly cartService: CartService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean {
    if (this.cartService.hasItems()) {
      return true;
    }

    this.router.navigate(['/cart']);
    return false;
  }
}
