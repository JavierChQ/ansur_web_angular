import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { CheckoutOrder, OrderProductLine } from '../models/order.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { CheckoutService } from '../services/checkout.service';
import {
  CheckoutCustomerData,
  CheckoutDeliveryData,
  DELIVERY_FEE,
  mapDocTypeToMercadoPago,
  STORE_BUSINESS_HOURS,
  STORE_PICKUP_ADDRESS,
} from '../models/checkout.model';
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
  isWaitingWebhook = false;
  paymentError = '';
  paymentNotice = '';
  checkoutExpired = false;
  yapePhone = '';
  yapeOtp = '';
  customerData: CheckoutCustomerData | null = null;
  deliveryData: CheckoutDeliveryData | null = null;
  subtotal = 0;
  deliveryFee = 0;
  readonly storeAddress = STORE_PICKUP_ADDRESS;
  readonly storeHours = STORE_BUSINESS_HOURS;

  private sdkReady = false;
  private viewReady = false;
  private cardFormMounted = false;
  private cardFormMountAttempts = 0;
  private readonly maxCardFormMountAttempts = 10;
  private expiryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private pendingPollSub: { unsubscribe: () => void } | null = null;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly checkoutService: CheckoutService,
    private readonly paymentService: PaymentService,
    private readonly mercadoPagoConfig: MercadoPagoConfigService,
    private readonly mercadoPagoSdk: MercadoPagoSdkService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const pendingOrder = this.checkoutState.getOrder();
    this.customerData = this.checkoutState.getCustomer();
    this.deliveryData = this.checkoutState.getDelivery();

    if (!pendingOrder || this.checkoutState.isExpired(pendingOrder)) {
      this.checkoutState.clear();
      this.router.navigate(['/cart']);
      return;
    }

    this.pendingOrder = pendingOrder;
    this.totalAmount = Number(pendingOrder.amount);
    this.subtotal = (pendingOrder.orderHasProducts ?? []).reduce(
      (sum, line) => sum + Number(line.product?.sale_price ?? 0) * line.quantity,
      0,
    );
    this.deliveryFee = this.deliveryData?.tipo === 'delivery' ? DELIVERY_FEE : 0;
    this.yapePhone = this.customerData?.celular ?? '';
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
            this.scheduleMountCardForm();
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
    this.scheduleMountCardForm();
  }

  ngOnDestroy(): void {
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval);
    }
    this.pendingPollSub?.unsubscribe();
    this.mercadoPagoSdk.unmountCardForm();
    this.cardFormMounted = false;
  }

  get expiresAtLabel(): string {
    if (!this.pendingOrder?.expires_at) {
      return '';
    }
    return new Date(this.pendingOrder.expires_at).toLocaleString('es-PE');
  }

  get payerEmail(): string {
    return this.customerData?.email || this.authService.getUserEmail() || '';
  }

  getCardholderName(): string {
    if (!this.customerData) {
      return '';
    }
    return `${this.customerData.nombres} ${this.customerData.apellidos}`.trim();
  }

  private getPrefillIdentificationType(): string | undefined {
    if (!this.customerData?.tipoDocumento) {
      return undefined;
    }
    return mapDocTypeToMercadoPago(this.customerData.tipoDocumento);
  }

  get receptorLabel(): string {
    if (!this.deliveryData) {
      return '';
    }
    if (this.deliveryData.receptorTipo === 'otra_persona' && this.deliveryData.receptor) {
      return `${this.deliveryData.receptor.nombres} ${this.deliveryData.receptor.apellidos}`;
    }
    if (this.customerData) {
      return `${this.customerData.nombres} ${this.customerData.apellidos}`;
    }
    return '';
  }

  submitCardPaymentClick(): void {
    const submit = document.getElementById('form-checkout__submit');
    if (submit) {
      submit.click();
    }
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    this.paymentError = '';
    this.paymentNotice = '';

    if (method === 'card') {
      this.cardFormMounted = false;
      this.cardFormMountAttempts = 0;
      this.scheduleMountCardForm();
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

  private scheduleMountCardForm(): void {
    this.cdr.detectChanges();
    setTimeout(() => this.tryMountCardForm(), 0);
  }

  private tryMountCardForm(): void {
    if (
      !this.sdkReady ||
      !this.viewReady ||
      this.paymentMethod !== 'card' ||
      this.cardFormMounted ||
      !this.pendingOrder ||
      this.isLoadingPayment
    ) {
      return;
    }

    const formElement = document.getElementById('form-checkout');
    if (!formElement || formElement.classList.contains('hidden')) {
      if (this.cardFormMountAttempts < this.maxCardFormMountAttempts) {
        this.cardFormMountAttempts += 1;
        this.scheduleMountCardForm();
      }
      return;
    }

    this.cardFormMountAttempts = 0;
    this.cardFormMounted = true;

    try {
      this.mercadoPagoSdk.mountCardForm({
        amount: this.totalAmount.toFixed(2),
        payerEmail: this.payerEmail,
        payerName: this.getCardholderName(),
        identificationType: this.getPrefillIdentificationType(),
        identificationNumber: this.customerData?.numeroDocumento,
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
    if (status === 'approved') {
      this.finishSuccessfulPayment();
      return;
    }

    if (['rejected', 'cancelled'].includes(status)) {
      this.isPaying = false;
      this.checkoutState.clear();
      this.router.navigate(['/error-en-la-compra']);
      return;
    }

    if (this.paymentService.isPendingMercadoPagoStatus(status)) {
      this.startPendingPaymentPolling();
      return;
    }

    this.isPaying = false;
    this.paymentError = 'El pago quedó pendiente. Revisa tu cuenta de Mercado Pago.';
  }

  private startPendingPaymentPolling(): void {
    if (!this.pendingOrder) {
      this.isPaying = false;
      return;
    }

    this.isPaying = false;
    this.isWaitingWebhook = true;
    this.paymentError = '';
    this.paymentNotice =
      'Estamos confirmando tu pago. No cierres esta ventana...';

    this.pendingPollSub?.unsubscribe();
    this.pendingPollSub = this.paymentService
      .waitForOrderResolution(this.pendingOrder.id)
      .subscribe({
        next: (orderStatus) => {
          this.isWaitingWebhook = false;
          this.paymentNotice = '';

          if (orderStatus.status === 'PAGADO') {
            this.finishSuccessfulPayment();
            return;
          }

          if (orderStatus.status === 'CANCELADO') {
            this.checkoutState.clear();
            this.router.navigate(['/error-en-la-compra']);
            return;
          }

          this.paymentError =
            'El pago sigue pendiente. Revisa Mercado Pago o intenta de nuevo.';
        },
        error: () => {
          this.isWaitingWebhook = false;
          this.paymentNotice = '';
          this.paymentError =
            'No pudimos confirmar el pago. Revisa Mercado Pago o intenta de nuevo.';
        },
        complete: () => {
          if (!this.isWaitingWebhook) {
            return;
          }
          this.isWaitingWebhook = false;
          this.paymentNotice = '';
          this.paymentError =
            'Tiempo de espera agotado. Si debitaron el pago, revisá Mis pedidos en unos minutos.';
        },
      });
  }

  private finishSuccessfulPayment(): void {
    this.isPaying = false;
    this.isWaitingWebhook = false;

    if (this.pendingOrder) {
      const summary = this.checkoutState.buildCompletedSummary(
        this.pendingOrder,
        this.customerData,
        this.deliveryData,
      );
      this.checkoutState.saveCompletedSummary(summary);
    }

    const orderId = this.pendingOrder?.id;
    const hadCheckoutToken = this.checkoutState.hasCheckoutToken();

    const finalize = (pendingActivation = false): void => {
      this.checkoutState.clearCheckoutToken();
      this.checkoutState.clear();
      this.cartService.clearLocalState();
      this.router.navigate(['/compra-realizada'], {
        queryParams: {
          ...(orderId ? { orderId } : {}),
          ...(pendingActivation ? { pendingActivation: '1' } : {}),
        },
      });
    };

    if (hadCheckoutToken && orderId) {
      this.checkoutService.claimGuestSession(orderId).subscribe({
        next: (session) => {
          if (session?.token) {
            this.authService.login(session.token);
            localStorage.setItem('token', session.token);
          }
          if (session?.user) {
            this.authService.setUser(session.user);
            localStorage.setItem('nombre', session.user.name || '');
            localStorage.setItem('apellidos', session.user.lastname || '');
            localStorage.setItem('id', String(session.user.id || ''));
          }
          finalize(!!session?.password_not_set);
        },
        error: () => finalize(true),
      });
      return;
    }

    finalize();
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
