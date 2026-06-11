import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { Product } from '../models/product.model';
import { normalizeProduct } from '../utils/product.util';
import {
  canIncreaseAddQuantity,
  getMaxAddableQuantity,
  getStockLabel,
  getStockLimitMessage,
} from '../utils/stock.util';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-detalle-del-producto',
  templateUrl: './detalle-del-producto.component.html',
  styleUrls: ['./detalle-del-producto.component.css']
})
export class DetalleDelProductoComponent implements OnInit {
  product: Product | null = null;
  quantity = 1;

  private readonly apiUrl = `${environment.apiUrl}/products`;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private cartService: CartService,
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
    }
  }

  private loadProduct(productId: string): void {
    this.http.get<Product>(`${this.apiUrl}/${productId}`).subscribe({
      next: (product) => {
        this.product = normalizeProduct(product);
        this.quantity = 1;
      },
      error: (err) => {
        console.error('Error al obtener el producto:', err);
        alert('Error al obtener el producto.');
      },
    });
  }

  isProductInStock(): boolean {
    return this.cartService.isProductInStock(this.product);
  }

  getStockLabel(): string {
    return getStockLabel(this.product);
  }

  canIncreaseQuantity(): boolean {
    if (!this.product) {
      return false;
    }
    return canIncreaseAddQuantity(
      this.product,
      this.quantity,
      this.cartService.getCartQuantityForProduct(this.product.id),
    );
  }

  aumentar(): void {
    if (!this.product) {
      return;
    }

    if (!this.canIncreaseQuantity()) {
      this.showModal(
        getStockLimitMessage(
          this.product,
          this.cartService.getCartQuantityForProduct(this.product.id),
        ),
      );
      return;
    }
    this.quantity++;
    this.updateQuantityInput();
  }

  disminuir(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.updateQuantityInput();
    }
  }

  updateQuantityInput(): void {
    const quantityInput = document.getElementById('quantity') as HTMLInputElement;
    if (quantityInput) {
      quantityInput.value = this.quantity.toString();
    }
  }

  onAddToCartClick(): void {
    if (!this.product) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.showModal('Debe iniciar sesión para agregar productos al carrito.');
      return;
    }

    this.cartService.addProductToCart(this.product, this.quantity).subscribe((result) => {
      if (result.success && this.product) {
        const max = getMaxAddableQuantity(
          this.product,
          this.cartService.getCartQuantityForProduct(this.product.id),
        );
        this.quantity = Math.min(this.quantity, Math.max(1, max));
        this.updateQuantityInput();
      }
      this.showModal(result.message);
    });
  }

  showModal(message: string): void {
    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
      modalContent.innerText = message;
    }
    const modal = document.getElementById('myModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  closeModal(): void {
    const modal = document.getElementById('myModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}
