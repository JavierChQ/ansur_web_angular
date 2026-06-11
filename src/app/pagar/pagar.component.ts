import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { CheckoutOrder } from '../models/order.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { MercadoPagoConfigService } from '../services/mercadopago-config.service';
import { MercadoPagoSdkService } from '../services/mercadopago-sdk.service';
import { CreatePaymentPayload, PaymentService } from '../services/payment.service';
import { MercadoPagoCardFormData } from '../../types/mercadopago';

interface PaymentProductSummary {
  id: number;
  name: string;
  sales_price: number;
  quantity: number;
  image?: string;
}

type PaymentMethod = 'card' | 'yape';

@Component({
  selector: 'app-pagar',
  templateUrl: './pagar.component.html',
  styleUrls: ['./pagar.component.css'],
})
export class PagarComponent implements OnInit, AfterViewInit, OnDestroy {
  products: PaymentProductSummary[] = [];
  totalAmount = 0;
  pendingOrder: CheckoutOrder | null = null;
  paymentMethod: PaymentMethod = 'card';
  isPaying = false;
  isLoadingPayment = true;
  paymentError = '';
  paymentNotice = '';
  checkoutExpired = false;
  yapePhone = '';
  yapeOtp = '';

  private sdkReady = false;
  private viewReady = false;
  private cardFormMounted = false;
  private expiryCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly paymentService: PaymentService,
    private readonly mercadoPagoConfig: MercadoPagoConfigService,
    private readonly mercadoPagoSdk: MercadoPagoSdkService,
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

    this.expiryCheckInterval = setInterval(() => {
      if (this.pendingOrder && this.checkoutState.isExpired(this.pendingOrder)) {
        this.handleCheckoutExpired();
      }
    }, 10_000);

    this.mercadoPagoConfig.getConfig().subscribe({
      next: (config) => {
        void this.mercadoPagoSdk
          .init(config.public_key, config.locale)
          .then(() => {
            this.sdkReady = true;
            this.isLoadingPayment = false;
            this.tryMountCardForm();
          })
          .catch(() => {
            this.isLoadingPayment = false;
            this.paymentError =
              'No se pudo cargar Mercado Pago. Recarga la página e intenta de nuevo.';
          });
      },
      error: () => {
        this.isLoadingPayment = false;
        this.paymentError =
          'No se pudo obtener la configuración de pago. Intenta nuevamente.';
      },
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryMountCardForm();
  }

  ngOnDestroy(): void {
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
    }
  }

  get expiresAtLabel(): string {
    if (!this.pendingOrder?.expires_at) {
      return '';
    }
    return new Date(this.pendingOrder.expires_at).toLocaleString('es-PE');
  }

  get payerEmail(): string {
    return this.authService.getUserEmail() || '';
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    this.paymentError = '';
    this.paymentNotice = '';

    if (method === 'card') {
      this.tryMountCardForm();
    }
  }

  isActiveMethod(method: PaymentMethod): boolean {
    return this.paymentMethod === method;
  }

  async payWithYape(): Promise<void> {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (!this.validateCheckout()) {
      return;
    }

    const phone = this.yapePhone.trim();
    const otp = this.yapeOtp.trim();

    if (!/^\d{9}$/.test(phone)) {
      this.paymentError = 'Ingresa un número de celular válido de 9 dígitos.';
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      this.paymentError = 'Ingresa el código OTP de 6 dígitos de tu app Yape.';
      return;
    }

    this.isPaying = true;
    this.paymentError = '';

    try {
      const token = await this.mercadoPagoSdk.createYapeToken(otp, phone);
      const payload: CreatePaymentPayload = {
        transaction_amount: this.totalAmount,
        token,
        installments: 1,
        payment_method_id: 'yape',
        payer: {
          email: this.payerEmail || 'cliente@ansur.com.pe',
        },
        order_id: this.pendingOrder.id,
      };

      this.paymentService.createPayment(payload).subscribe({
        next: (payment) => this.handlePaymentResult(payment.status),
        error: (error) => {
          this.isPaying = false;
          this.paymentError = this.mapPaymentError(error);
        },
      });
    } catch {
      this.isPaying = false;
      this.paymentError =
        'No se pudo validar los datos de Yape. Verifica el celular y el código OTP.';
    }
  }

  private tryMountCardForm(): void {
    if (
      !this.sdkReady ||
      !this.viewReady ||
      this.paymentMethod !== 'card' ||
      this.cardFormMounted ||
      !this.pendingOrder
    ) {
      return;
    }

    const formElement = document.getElementById('form-checkout');
    if (!formElement) {
      return;
    }

    this.cardFormMounted = true;

    try {
      this.mercadoPagoSdk.mountCardForm({
        amount: this.totalAmount.toFixed(2),
        payerEmail: this.payerEmail,
        onSubmit: (data) => this.submitCardPayment(data),
        onError: () => {
          this.paymentError =
            'No se pudo cargar el formulario de tarjeta. Recarga la página.';
        },
        onInstallmentsError: () => {
          this.paymentNotice =
            'No se pudieron cargar las cuotas. El pago se procesará en 1 cuota.';
        },
      });
    } catch {
      this.cardFormMounted = false;
      this.paymentError =
        'No se pudo inicializar el formulario de tarjeta. Recarga la página.';
    }
  }

  private submitCardPayment(data: MercadoPagoCardFormData): void {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (!this.validateCheckout()) {
      return;
    }

    const cardError = this.validateCardFormData(data);
    if (cardError) {
      this.paymentError = cardError;
      return;
    }

    const installments = this.resolveInstallments(data.installments);
    if (installments.usedFallback && !this.paymentNotice) {
      this.paymentNotice =
        'No se seleccionó una cuota. El pago se procesará en 1 cuota.';
    }

    this.isPaying = true;
    this.paymentError = '';

    const payload: CreatePaymentPayload = {
      transaction_amount: this.totalAmount,
      token: data.token,
      installments: installments.value,
      issuer_id: String(data.issuerId),
      payment_method_id: data.paymentMethodId,
      payer: {
        email: data.cardholderEmail || this.payerEmail,
        identification: {
          type: data.identificationType,
          number: data.identificationNumber,
        },
      },
      order_id: this.pendingOrder.id,
    };

    this.paymentService.createPayment(payload).subscribe({
      next: (payment) => this.handlePaymentResult(payment.status),
      error: (error) => {
        this.isPaying = false;
        this.paymentError = this.mapPaymentError(error);
      },
    });
  }

  private validateCardFormData(data: MercadoPagoCardFormData): string | null {
    if (!data.paymentMethodId?.trim()) {
      return 'No se detectó el tipo de tarjeta. Verificá el número ingresado.';
    }
    if (!data.issuerId?.trim()) {
      return 'Seleccioná el banco emisor de la tarjeta.';
    }
    if (!data.identificationType?.trim() || !data.identificationNumber?.trim()) {
      return 'Completá el tipo y número de documento del titular.';
    }
    return null;
  }

  private resolveInstallments(raw: string): { value: number; usedFallback: boolean } {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= 1) {
      return { value: parsed, usedFallback: false };
    }
    return { value: 1, usedFallback: true };
  }

  private validateCheckout(): boolean {
    if (!this.pendingOrder) {
      return false;
    }

    if (this.checkoutState.isExpired(this.pendingOrder)) {
      this.handleCheckoutExpired();
      return false;
    }

    return true;
  }

  private handleCheckoutExpired(): void {
    this.isPaying = false;
    this.checkoutExpired = true;
    this.paymentError =
      'Tu reserva expiró (15 min). Volvé al carrito e iniciá el checkout de nuevo.';
    this.checkoutState.clear();
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
      if (message.includes('expirado')) {
        this.handleCheckoutExpired();
        return this.paymentError;
      }
      if (/invalid credentials/i.test(message)) {
        return (
          'Credenciales de Mercado Pago inválidas en el servidor. ' +
          'Actualizá MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY en el .env ' +
          '(ambas del mismo panel de prueba) y reiniciá el backend.'
        );
      }
      return message;
    }
    if (error?.status === 400) {
      return 'Los datos del pago no son válidos. Revisá la tarjeta e intentá de nuevo.';
    }
    if (error?.status === 409) {
      this.checkoutState.clear();
      return 'La orden ya no está pendiente. Volvé al carrito e iniciá el checkout de nuevo.';
    }
    if (error?.status === 410) {
      this.handleCheckoutExpired();
      return this.paymentError;
    }
    return 'No se pudo procesar el pago. Intenta nuevamente.';
  }
}
