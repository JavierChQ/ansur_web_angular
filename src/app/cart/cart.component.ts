import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartService } from '../cart.service';
import { CartDisplayItem } from '../models/cart.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { canIncreaseCartQuantity, getCartStockLimitMessage, getStockLabel } from '../utils/stock.util';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartDisplayItem[] = [];
  totalAmount = 0;
  isLoading = true;
  error = '';
  private subscription?: Subscription;

  constructor(
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.subscription = this.cartService.displayItems$.subscribe((items) => {
      this.cartItems = items;
      this.totalAmount = this.cartService.getTotal();
    });

    this.cartService.refreshCart().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el carrito.';
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  isItemInStock(item: CartDisplayItem): boolean {
    return this.cartService.isProductInStock(item);
  }

  canIncreaseQuantity(item: CartDisplayItem): boolean {
    return canIncreaseCartQuantity(item);
  }

  getStockLabel(item: CartDisplayItem): string {
    return getStockLabel(item);
  }

  updateQuantity(productId: number, change: number): void {
    const item = this.cartItems.find((cartItem) => cartItem.id_product === productId);
    if (!item) {
      return;
    }

    const nextQuantity = item.quantity + change;
    if (nextQuantity < 1) {
      return;
    }

    if (change > 0 && !this.canIncreaseQuantity(item)) {
      this.error = getCartStockLimitMessage(item);
      return;
    }

    this.error = '';
    this.cartService.setItemQuantity(productId, nextQuantity).subscribe((result) => {
      if (!result.success) {
        this.error = result.message;
      }
    });
  }

  removeItem(productId: number): void {
    this.error = '';
    this.cartService.removeItem(productId).subscribe((result) => {
      if (!result.success) {
        this.error = result.message;
      }
    });
  }

  startCheckout(): void {
    this.checkoutState.clear();
    void this.router.navigate(['/datos-del-usuario']);
  }
}
