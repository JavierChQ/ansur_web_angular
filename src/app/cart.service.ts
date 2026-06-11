import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { catchError, concatMap, finalize, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Cart, CartDisplayItem } from './models/cart.model';
import { CartApiService } from './services/cart-api.service';
import { isInStock } from './utils/stock.util';

export interface CartAddResult {
  success: boolean;
  message: string;
}

interface LegacyCartItem {
  id: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly cartSubject = new BehaviorSubject<Cart | null>(null);
  private readonly cartCountSubject = new BehaviorSubject<number>(0);
  private readonly displayItemsSubject = new BehaviorSubject<CartDisplayItem[]>([]);
  private readonly imageCache = new Map<number, string>();
  private isSyncing = false;

  readonly cart$ = this.cartSubject.asObservable();
  readonly cartCount$ = this.cartCountSubject.asObservable();
  readonly displayItems$ = this.displayItemsSubject.asObservable();

  constructor(
    private readonly authService: AuthService,
    private readonly cartApi: CartApiService,
  ) {}

  isProductInStock(product: { in_stock?: boolean } | null | undefined): boolean {
    return isInStock(product);
  }

  getDisplayItems(): CartDisplayItem[] {
    return this.displayItemsSubject.value;
  }

  getTotal(): number {
    return this.cartSubject.value?.total ?? 0;
  }

  getCartQuantityForProduct(productId: number): number {
    const cart = this.cartSubject.value;
    return cart?.items.find((item) => item.id_product === productId)?.quantity ?? 0;
  }

  refreshCart(): Observable<Cart | null> {
    if (!this.authService.isLoggedIn()) {
      this.clearLocalState();
      return of(null);
    }

    return this.cartApi.getCart().pipe(
      tap((cart) => this.applyCart(cart)),
      catchError((error) => {
        console.error('Error al cargar el carrito', error);
        this.clearLocalState();
        return of(null);
      }),
    );
  }

  syncAfterLogin(): Observable<void> {
    if (!this.authService.isLoggedIn() || this.isSyncing) {
      return of(undefined);
    }

    const legacyItems = this.readLegacyCart();
    this.isSyncing = true;

    const migration$ = legacyItems.length
      ? from(legacyItems).pipe(
          concatMap((item) =>
            this.cartApi.addOrUpdateItem(item.id, item.quantity).pipe(
              catchError((error) => {
                console.error(`Error migrando producto ${item.id}`, error);
                return of(null);
              }),
            ),
          ),
          finalize(() => localStorage.removeItem('cart')),
        )
      : of(null);

    return migration$.pipe(
      switchMap(() => this.refreshCart()),
      map(() => undefined),
      finalize(() => {
        this.isSyncing = false;
      }),
    );
  }

  addProductToCart(
    product: {
      id: number;
      name: string;
      in_stock?: boolean;
      image1?: string;
    },
    quantity: number,
  ): Observable<CartAddResult> {
    if (!this.authService.isLoggedIn()) {
      return of({
        success: false,
        message: 'Debe iniciar sesión para agregar productos al carrito.',
      });
    }

    if (!isInStock(product)) {
      return of({
        success: false,
        message: 'Este producto no tiene stock disponible.',
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return of({
        success: false,
        message: 'La cantidad debe ser al menos 1.',
      });
    }

    if (product.image1) {
      this.imageCache.set(product.id, product.image1);
    }

    const source$ = this.cartSubject.value ? of(this.cartSubject.value) : this.cartApi.getCart();

    return source$.pipe(
      switchMap((cart) => {
        const existingQty =
          cart.items.find((item) => item.id_product === product.id)?.quantity ?? 0;
        return this.cartApi.addOrUpdateItem(product.id, existingQty + quantity);
      }),
      map((cart) => {
        this.applyCart(cart);
        return {
          success: true,
          message: 'Producto agregado al carrito.',
        };
      }),
      catchError((error) =>
        of({
          success: false,
          message: this.mapError(error),
        }),
      ),
    );
  }

  setItemQuantity(productId: number, quantity: number): Observable<CartAddResult> {
    if (!this.authService.isLoggedIn()) {
      return of({
        success: false,
        message: 'Debe iniciar sesión para modificar el carrito.',
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return of({
        success: false,
        message: 'La cantidad debe ser al menos 1.',
      });
    }

    return this.cartApi.addOrUpdateItem(productId, quantity).pipe(
      map((cart) => {
        this.applyCart(cart);
        return { success: true, message: '' };
      }),
      catchError((error) =>
        of({
          success: false,
          message: this.mapError(error),
        }),
      ),
    );
  }

  removeItem(productId: number): Observable<CartAddResult> {
    if (!this.authService.isLoggedIn()) {
      return of({
        success: false,
        message: 'Debe iniciar sesión para modificar el carrito.',
      });
    }

    return this.cartApi.removeItem(productId).pipe(
      map((cart) => {
        this.imageCache.delete(productId);
        this.applyCart(cart);
        return { success: true, message: '' };
      }),
      catchError((error) =>
        of({
          success: false,
          message: this.mapError(error),
        }),
      ),
    );
  }

  updateCartCount(): void {
    if (!this.authService.isLoggedIn()) {
      this.cartCountSubject.next(0);
      return;
    }

    if (this.cartSubject.value) {
      this.publishCount(this.cartSubject.value);
      return;
    }

    this.refreshCart().subscribe();
  }

  clearLocalState(): void {
    this.cartSubject.next(null);
    this.displayItemsSubject.next([]);
    this.cartCountSubject.next(0);
  }

  private applyCart(cart: Cart): void {
    this.cartSubject.next(cart);
    this.displayItemsSubject.next(this.toDisplayItems(cart.items));
    this.publishCount(cart);
  }

  private toDisplayItems(items: Cart['items']): CartDisplayItem[] {
    return items.map((item) => ({
      ...item,
      image: this.imageCache.get(item.id_product),
    }));
  }

  private publishCount(cart: Cart): void {
    this.cartCountSubject.next(cart.items.length);
  }

  private readLegacyCart(): LegacyCartItem[] {
    const raw = localStorage.getItem('cart');
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const merged = new Map<number, number>();
      for (const item of parsed) {
        const id = Number(item.id);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 1) {
          continue;
        }
        merged.set(id, (merged.get(id) ?? 0) + quantity);
        if (item.image) {
          this.imageCache.set(id, item.image);
        }
      }

      return Array.from(merged.entries()).map(([id, quantity]) => ({ id, quantity }));
    } catch {
      return [];
    }
  }

  private mapError(error: { error?: { message?: string | string[] }; status?: number }): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (error?.status === 409) {
      return 'Stock insuficiente para la cantidad solicitada.';
    }
    return 'No se pudo actualizar el carrito.';
  }
}
