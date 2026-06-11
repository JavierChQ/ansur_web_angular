import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { CheckoutOrder } from '../models/order.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { PaymentService } from '../services/payment.service';

interface PaymentProductSummary {
  id: number;
  name: string;
  sales_price: number;
  quantity: number;
  image?: string;
}

@Component({
  selector: 'app-pagar',
  templateUrl: './pagar.component.html',
  styleUrls: ['./pagar.component.css'],
})
export class PagarComponent implements OnInit {
  products: PaymentProductSummary[] = [];
  totalAmount = 0;
  pendingOrder: CheckoutOrder | null = null;
  isPaying = false;
  paymentError = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    const pendingOrder = this.checkoutState.get();

    if (!pendingOrder || this.checkoutState.isExpired(pendingOrder)) {
      this.checkoutState.clear();
      this.router.navigate(['/cart']);
      return;
    }

    this.pendingOrder = pendingOrder;
    this.totalAmount = Number(pendingOrder.amount);
    this.products = (pendingOrder.orderHasProducts ?? []).map((line) => ({
      id: line.id_product,
      name: line.product?.name ?? `Producto #${line.id_product}`,
      sales_price: Number(line.product?.sale_price ?? 0),
      quantity: line.quantity,
      image: line.product?.image1,
    }));
  }

  get expiresAtLabel(): string {
    if (!this.pendingOrder?.expires_at) {
      return '';
    }
    return new Date(this.pendingOrder.expires_at).toLocaleString('es-PE');
  }

  payWithMercadoPago(): void {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (this.checkoutState.isExpired(this.pendingOrder)) {
      this.paymentError = 'Tu reserva expiró. Volvé al carrito e intentá de nuevo.';
      this.checkoutState.clear();
      return;
    }

    this.isPaying = true;
    this.paymentError = '';

    const cardTokenPayload = {
      card_number: '5031755734530604',
      expiration_year: '2030',
      expiration_month: 11,
      security_code: '123',
      cardholder: {
        name: 'APRO',
        identification: {
          number: '12345678',
          type: 'DNI',
        },
      },
    };

    this.paymentService
      .createCardToken(cardTokenPayload)
      .pipe(
        switchMap((tokenResponse) =>
          this.paymentService.createPayment({
            transaction_amount: this.totalAmount,
            token: tokenResponse.id,
            installments: 1,
            issuer_id: '310',
            payment_method_id: 'master',
            payer: {
              email: this.authService.getUserEmail() || 'test_user@test.com',
              identification: {
                type: 'DNI',
                number: '12345678',
              },
            },
            order_id: this.pendingOrder!.id,
          }),
        ),
      )
      .subscribe({
        next: (payment) => this.handlePaymentResult(payment.status),
        error: (error) => {
          this.isPaying = false;
          this.paymentError = this.mapPaymentError(error);
        },
      });
  }

  private handlePaymentResult(status: string): void {
    this.isPaying = false;

    if (status === 'approved') {
      this.checkoutState.clear();
      this.cartService.clearLocalState();
      this.router.navigate(['/compra-realizada'], {
        queryParams: { orderId: this.pendingOrder?.id },
      });
      return;
    }

    if (['rejected', 'cancelled'].includes(status)) {
      this.checkoutState.clear();
      this.router.navigate(['/error-en-la-compra']);
      return;
    }

    this.paymentError = 'El pago quedó pendiente. Revisa tu cuenta de Mercado Pago.';
  }

  private mapPaymentError(error: {
    status?: number;
    error?: { message?: string | string[] };
  }): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (error?.status === 409) {
      return 'La orden ya no está pendiente de pago.';
    }
    if (error?.status === 410) {
      this.checkoutState.clear();
      return 'Tu reserva expiró. Volvé al carrito e intentá de nuevo.';
    }
    return 'No se pudo procesar el pago. Intenta nuevamente.';
  }
}
