import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, finalize, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Cart, CartDisplayItem } from './models/cart.model';
import { CartApiService } from './services/cart-api.service';
import { ProductService } from './services/product.service';
import { isInStock } from './utils/stock.util';

export interface CartAddResult {
  success: boolean;
  message: string;
}

interface StoredCartItem {
  id: number;
  quantity: number;
  name?: string;
  sales_price?: number;
  image?: string;
  in_stock?: boolean;
  available?: number;
}

const GUEST_CART_KEY = 'guest_cart';

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
    private readonly productService: ProductService,
  ) {}

  isProductInStock(product: { in_stock?: boolean } | null | undefined): boolean {
    return isInStock(product);
  }

  hasItems(): boolean {
    const cart = this.cartSubject.value;
    return (cart?.items?.length ?? 0) > 0;
  }

  isLocalCart(): boolean {
    return this.cartSubject.value?.status === 'LOCAL';
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

  getCheckoutItems(): { id_product: number; quantity: number }[] {
    const cart = this.cartSubject.value;
    if (!cart) {
      return [];
    }

    return cart.items.map((item) => ({
      id_product: item.id_product,
      quantity: item.quantity,
    }));
  }

  refreshCart(): Observable<Cart | null> {
    if (this.authService.isLoggedIn()) {
      return this.cartApi.getCart().pipe(
        tap((cart) => this.applyCart(cart)),
        catchError((error) => {
          console.error('Error al cargar el carrito', error);
          this.clearLocalState();
          return of(null);
        }),
      );
    }

    return this.refreshGuestCart();
  }

  syncAfterLogin(): Observable<void> {
    if (!this.authService.isLoggedIn() || this.isSyncing) {
      return of(undefined);
    }

    const guestItems = this.readGuestCart();
    this.isSyncing = true;

    const migration$ = guestItems.length
      ? from(guestItems).pipe(
          concatMap((item) =>
            this.cartApi.addOrUpdateItem(item.id, item.quantity).pipe(
              catchError((error) => {
                console.error(`Error migrando producto ${item.id}`, error);
                return of(null);
              }),
            ),
          ),
          finalize(() => this.clearGuestCartStorage()),
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
      available?: number;
      image1?: string;
      sales_price?: number;
      sale_price?: number;
    },
    quantity: number,
  ): Observable<CartAddResult> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return of({
        success: false,
        message: 'La cantidad debe ser al menos 1.',
      });
    }

    if (product.image1) {
      this.imageCache.set(product.id, product.image1);
    }

    return this.productService.getFreshProduct(product.id).pipe(
      switchMap((freshProduct) => {
        const normalized = this.productService.normalize(freshProduct);
        const merged = {
          ...product,
          ...normalized,
          sales_price: normalized.sales_price ?? product.sales_price ?? product.sale_price,
        };

        if (!isInStock(merged)) {
          return of({
            success: false,
            message: 'Este producto no tiene stock disponible.',
          });
        }

        const existingQty = this.getCartQuantityForProduct(product.id);
        const maxAddable = Math.max(0, (merged.available ?? 0) - existingQty);
        if (quantity > maxAddable) {
          return of({
            success: false,
            message:
              maxAddable <= 0
                ? 'Este producto no tiene stock disponible.'
                : `Solo puedes agregar hasta ${maxAddable} unidad${maxAddable === 1 ? '' : 'es'} (stock disponible).`,
          });
        }

        if (this.authService.isLoggedIn()) {
          return this.addProductToApiCart(product.id, existingQty + quantity);
        }

        return this.addProductToGuestCart(merged, existingQty + quantity);
      }),
      catchError(() =>
        of({
          success: false,
          message: 'No se pudo validar el stock del producto.',
        }),
      ),
    );
  }

  setItemQuantity(productId: number, quantity: number): Observable<CartAddResult> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return of({
        success: false,
        message: 'La cantidad debe ser al menos 1.',
      });
    }

    return this.productService.getFreshProduct(productId).pipe(
      switchMap((freshProduct) => {
        const normalized = this.productService.normalize(freshProduct);
        if (!isInStock(normalized)) {
          return of({
            success: false,
            message: 'Este producto no tiene stock disponible.',
          });
        }

        if ((normalized.available ?? 0) < quantity) {
          return of({
            success: false,
            message: `Solo hay ${normalized.available ?? 0} unidad(es) disponible(s) en stock.`,
          });
        }

        if (this.authService.isLoggedIn()) {
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

        return this.updateGuestItemQuantity(productId, quantity, normalized);
      }),
      catchError(() =>
        of({
          success: false,
          message: 'No se pudo validar el stock del producto.',
        }),
      ),
    );
  }

  removeItem(productId: number): Observable<CartAddResult> {
    if (this.authService.isLoggedIn()) {
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

    const items = this.readGuestCart().filter((item) => item.id !== productId);
    this.imageCache.delete(productId);
    this.persistGuestCart(items);
    return this.refreshGuestCart().pipe(map(() => ({ success: true, message: '' })));
  }

  updateCartCount(): void {
    if (this.authService.isLoggedIn()) {
      if (this.cartSubject.value) {
        this.publishCount(this.cartSubject.value);
        return;
      }
      this.refreshCart().subscribe();
      return;
    }

    this.refreshGuestCart().subscribe();
  }

  clearLocalState(): void {
    this.cartSubject.next(null);
    this.displayItemsSubject.next([]);
    this.cartCountSubject.next(0);
  }

  clearGuestCartStorage(): void {
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem('cart');
  }

  private addProductToApiCart(productId: number, quantity: number): Observable<CartAddResult> {
    const source$ = this.cartSubject.value ? of(this.cartSubject.value) : this.cartApi.getCart();

    return source$.pipe(
      switchMap(() => this.cartApi.addOrUpdateItem(productId, quantity)),
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

  private addProductToGuestCart(
    product: {
      id: number;
      name: string;
      sales_price?: number;
      sale_price?: number;
      available?: number;
      in_stock?: boolean;
      image1?: string;
    },
    quantity: number,
  ): Observable<CartAddResult> {
    const items = this.readGuestCart();
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity = quantity;
      existing.name = product.name;
      existing.sales_price = product.sales_price ?? product.sale_price;
      existing.available = product.available;
      existing.in_stock = product.in_stock;
      if (product.image1) {
        existing.image = product.image1;
      }
    } else {
      items.push({
        id: product.id,
        quantity,
        name: product.name,
        sales_price: product.sales_price ?? product.sale_price,
        available: product.available,
        in_stock: product.in_stock,
        image: product.image1,
      });
    }

    this.persistGuestCart(items);
    return this.refreshGuestCart().pipe(
      map(() => ({
        success: true,
        message: 'Producto agregado al carrito.',
      })),
    );
  }

  private updateGuestItemQuantity(
    productId: number,
    quantity: number,
    product: { name: string; sales_price?: number; available?: number; in_stock?: boolean },
  ): Observable<CartAddResult> {
    const items = this.readGuestCart();
    const existing = items.find((item) => item.id === productId);
    if (!existing) {
      return of({ success: false, message: 'Producto no encontrado en el carrito.' });
    }

    existing.quantity = quantity;
    existing.name = product.name;
    existing.sales_price = product.sales_price;
    existing.available = product.available;
    existing.in_stock = product.in_stock;
    this.persistGuestCart(items);

    return this.refreshGuestCart().pipe(map(() => ({ success: true, message: '' })));
  }

  private refreshGuestCart(): Observable<Cart | null> {
    const storedItems = this.readGuestCart();
    if (!storedItems.length) {
      this.clearLocalState();
      return of(null);
    }

    const requests = storedItems.map((item) =>
      this.productService.getFreshProduct(item.id).pipe(
        map((product) => {
          const normalized = this.productService.normalize(product);
          return {
            ...item,
            name: normalized.name ?? item.name,
            sales_price: normalized.sales_price ?? item.sales_price ?? 0,
            available: normalized.available,
            in_stock: normalized.in_stock,
            image: item.image ?? normalized.image1,
          };
        }),
        catchError(() => of(item)),
      ),
    );

    return forkJoin(requests).pipe(
      tap((items) => {
        this.persistGuestCart(items);
        this.applyGuestCart(items);
      }),
      map(() => this.cartSubject.value),
      catchError(() => {
        this.clearLocalState();
        return of(null);
      }),
    );
  }

  private applyGuestCart(items: StoredCartItem[]): void {
    const cartItems = items.map((item) => ({
      id_product: item.id,
      name: item.name ?? `Producto #${item.id}`,
      sales_price: Number(item.sales_price ?? 0),
      quantity: item.quantity,
      available: item.available ?? 0,
      in_stock: isInStock(item),
    }));

    const total = cartItems.reduce(
      (sum, item) => sum + item.sales_price * item.quantity,
      0,
    );

    const cart: Cart = {
      id: 0,
      status: 'LOCAL',
      expires_at: '',
      items: cartItems,
      total,
    };

    this.cartSubject.next(cart);
    this.displayItemsSubject.next(
      items.map((item) => ({
        id_product: item.id,
        name: item.name ?? `Producto #${item.id}`,
        sales_price: Number(item.sales_price ?? 0),
        quantity: item.quantity,
        available: item.available ?? 0,
        in_stock: isInStock(item),
        image: item.image ?? this.imageCache.get(item.id),
      })),
    );
    this.publishCount(cart);
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

  private readGuestCart(): StoredCartItem[] {
    const raw = localStorage.getItem(GUEST_CART_KEY) ?? localStorage.getItem('cart');
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const merged = new Map<number, StoredCartItem>();
      for (const item of parsed) {
        const id = Number(item.id ?? item.id_product);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 1) {
          continue;
        }

        const existing = merged.get(id);
        const image = item.image ?? item.image1;
        if (existing) {
          existing.quantity += quantity;
          if (image) {
            existing.image = image;
          }
        } else {
          merged.set(id, {
            id,
            quantity,
            name: item.name,
            sales_price: item.sales_price ?? item.sale_price,
            image,
            available: item.available,
            in_stock: item.in_stock,
          });
        }

        if (image) {
          this.imageCache.set(id, image);
        }
      }

      return Array.from(merged.values());
    } catch {
      return [];
    }
  }

  private persistGuestCart(items: StoredCartItem[]): void {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    localStorage.removeItem('cart');
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
