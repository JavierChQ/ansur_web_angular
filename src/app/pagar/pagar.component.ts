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
  CheckoutInvoiceData,
  getDeliveryFee,
  mapDocTypeToMercadoPago,
  STORE_BUSINESS_HOURS,
  STORE_PICKUP_ADDRESS,
} from '../models/checkout.model';
import { MercadoPagoConfigService } from '../services/mercadopago-config.service';
import { MercadoPagoSdkService } from '../services/mercadopago-sdk.service';
import { CreatePaymentPayload, PaymentService } from '../services/payment.service';
import { WhatsappPaymentService } from '../services/whatsapp-payment.service';
import { MercadoPagoCardFormData } from '../../types/mercadopago';

interface PaymentProductSummary {
  id: number;
  name: string;
  sales_price: number;
  quantity: number;
  image?: string;
}

type PaymentChannel = 'mercadopago' | 'whatsapp';
type MercadoPagoSubMethod = 'card' | 'yape';
type PaymentMethod = MercadoPagoSubMethod | 'whatsapp';

@Component({
  selector: 'app-pagar',
  templateUrl: './pagar.component.html',
  styleUrls: ['./pagar.component.css'],
})
export class PagarComponent implements OnInit, AfterViewInit, OnDestroy {
  products: PaymentProductSummary[] = [];
  totalAmount = 0;
  pendingOrder: CheckoutOrder | null = null;
  paymentChannel: PaymentChannel = 'mercadopago';
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
  invoiceData: CheckoutInvoiceData | null = null;
  subtotal = 0;
  deliveryFee = 0;
  mercadoPagoMinAmount = 100;
  readonly storeAddress = STORE_PICKUP_ADDRESS;
  readonly storeHours = STORE_BUSINESS_HOURS;
  cardFormVisible = true;

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
    private readonly whatsappPaymentService: WhatsappPaymentService,
    private readonly mercadoPagoConfig: MercadoPagoConfigService,
    private readonly mercadoPagoSdk: MercadoPagoSdkService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cardFormMounted = false;
    this.cardFormMountAttempts = 0;
    this.sdkReady = false;
    this.viewReady = false;
    this.isLoadingPayment = true;
    this.paymentError = '';

    const pendingOrder = this.checkoutState.getOrder();
    this.customerData = this.checkoutState.getCustomer();
    this.deliveryData = this.checkoutState.getDelivery();
    this.invoiceData = this.checkoutState.getInvoice();

    if (!pendingOrder || this.checkoutState.isExpired(pendingOrder)) {
      this.checkoutState.clear();
      this.router.navigate(['/cart']);
      return;
    }

    this.pendingOrder = pendingOrder;
    if (pendingOrder.payment_channel === 'whatsapp') {
      this.paymentChannel = 'whatsapp';
      this.paymentMethod = 'whatsapp';
    }
    this.subtotal = (pendingOrder.orderHasProducts ?? []).reduce(
      (sum, line) => sum + Number(line.product?.sale_price ?? 0) * line.quantity,
      0,
    );
    this.deliveryFee = getDeliveryFee(this.deliveryData?.tipo);
    this.totalAmount = this.subtotal + this.deliveryFee;

    if (Math.abs(Number(pendingOrder.amount) - this.totalAmount) > 0.01) {
      this.paymentError =
        'El total del pedido no coincide con el tipo de entrega. Volvé a tipo de entrega.';
    }

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
        this.mercadoPagoMinAmount = config.min_online_payment_amount ?? 100;
        this.applyMercadoPagoAvailability();

        if (!this.mercadoPagoAvailable) {
          this.isLoadingPayment = false;
          return;
        }

        void this.mercadoPagoSdk
          .init(config.public_key, config.locale)
          .then(async () => {
            this.sdkReady = true;
            await this.refreshCardFormShell();
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
    this.mercadoPagoSdk.reset();
    this.cardFormMounted = false;
    this.cardFormVisible = false;
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

  get mercadoPagoAvailable(): boolean {
    return this.subtotal + 0.001 >= this.mercadoPagoMinAmount;
  }

  get mercadoPagoMinAmountLabel(): string {
    return this.mercadoPagoMinAmount.toFixed(2);
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

  get invoiceSummary(): string {
    if (!this.invoiceData?.validated) {
      return '';
    }

    if (this.invoiceData.tipo === 'BOLETA') {
      return `Boleta — DNI ${this.invoiceData.numeroDocumento} — ${this.invoiceData.nombreTitular ?? ''}`.trim();
    }

    return `Factura — RUC ${this.invoiceData.numeroDocumento} — ${this.invoiceData.razonSocial ?? ''}`.trim();
  }

  submitCardPaymentClick(): void {
    const submit = document.getElementById('form-checkout__submit');
    if (submit) {
      submit.click();
    }
  }

  setPaymentChannel(channel: PaymentChannel): void {
    if (this.paymentChannel === channel) {
      return;
    }

    if (channel === 'mercadopago' && !this.mercadoPagoAvailable) {
      this.paymentNotice =
        `El pago online requiere un subtotal mínimo de S/ ${this.mercadoPagoMinAmountLabel} en productos.`;
      return;
    }

    const previousChannel = this.paymentChannel;
    this.paymentChannel = channel;
    this.paymentError = '';
    this.paymentNotice = '';

    if (channel === 'whatsapp') {
      this.paymentMethod = 'whatsapp';
      return;
    }

    this.paymentMethod = 'card';

    if (previousChannel === 'whatsapp' && this.pendingOrder) {
      this.whatsappPaymentService
        .resetMercadoPagoCheckout(this.pendingOrder.id)
        .subscribe({
          next: (response) => this.applyCheckoutTimingUpdate(response.expires_at, null),
          error: () => {
            this.paymentNotice =
              'No se pudo restablecer el tiempo de checkout. Si expira, vuelve al carrito.';
          },
        });
    }

    this.remountCardForm();
  }

  setMercadoPagoSubMethod(method: MercadoPagoSubMethod): void {
    if (
      this.paymentChannel !== 'mercadopago' ||
      !this.mercadoPagoAvailable ||
      this.paymentMethod === method
    ) {
      return;
    }

    this.paymentMethod = method;
    this.paymentError = '';
    this.paymentNotice = '';

    if (method === 'card') {
      this.remountCardForm();
    }
  }

  isActiveChannel(channel: PaymentChannel): boolean {
    return this.paymentChannel === channel;
  }

  isActiveMpSubMethod(method: MercadoPagoSubMethod): boolean {
    return this.paymentChannel === 'mercadopago' && this.paymentMethod === method;
  }

  private remountCardForm(): void {
    this.cardFormMounted = false;
    this.cardFormMountAttempts = 0;
    void this.refreshCardFormShell().then(() => this.scheduleMountCardForm());
  }

  payWithWhatsapp(): void {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (!this.validateCheckout()) {
      return;
    }

    this.isPaying = true;
    this.paymentError = '';

    this.whatsappPaymentService.registerIntent(this.pendingOrder.id).subscribe({
      next: (response) => {
        this.isPaying = false;
        this.applyCheckoutTimingUpdate(response.expires_at, response.payment_channel);
        this.pendingOrder = {
          ...this.pendingOrder!,
          reference_code: response.reference_code,
          expires_at: response.expires_at,
          payment_channel: response.payment_channel,
        };
        this.checkoutState.saveOrder(this.pendingOrder);

        this.checkoutState.savePendingWhatsappSummary({
          orderId: response.order_id,
          orderReferenceCode: response.reference_code,
          total: response.amount,
          expiresAt: response.expires_at,
          whatsappUrl: response.whatsapp_url,
        });

        window.open(response.whatsapp_url, '_blank', 'noopener,noreferrer');
        this.router.navigate(['/pedido-registrado'], {
          queryParams: {
            orderId: response.order_id,
            referenceCode: response.reference_code,
            expiresAt: response.expires_at,
            whatsappUrl: response.whatsapp_url,
          },
        });
      },
      error: (error) => {
        this.isPaying = false;
        this.paymentError = this.mapPaymentError(error);
      },
    });
  }

  private applyCheckoutTimingUpdate(
    expiresAt: string,
    paymentChannel: string | null,
  ): void {
    if (!this.pendingOrder) {
      return;
    }

    this.pendingOrder = {
      ...this.pendingOrder,
      expires_at: expiresAt,
      payment_channel: paymentChannel,
    };
    this.checkoutState.saveOrder(this.pendingOrder);
  }

  async payWithYape(): Promise<void> {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (!this.mercadoPagoAvailable) {
      this.paymentError =
        `El pago online requiere un subtotal mínimo de S/ ${this.mercadoPagoMinAmountLabel} en productos.`;
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

  private applyMercadoPagoAvailability(): void {
    if (this.mercadoPagoAvailable || this.paymentChannel === 'whatsapp') {
      return;
    }

    this.paymentChannel = 'whatsapp';
    this.paymentMethod = 'whatsapp';
    this.paymentNotice =
      `El pago online está disponible desde S/ ${this.mercadoPagoMinAmountLabel} en productos. ` +
      'Para montos menores, coordina tu pago por WhatsApp.';
  }

  private scheduleMountCardForm(): void {
    this.cdr.detectChanges();
    setTimeout(() => {
      void this.mountCardFormAsync();
    }, 0);
  }

  private async refreshCardFormShell(): Promise<void> {
    this.cardFormVisible = false;
    this.cdr.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    this.cardFormVisible = true;
    this.cdr.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  private async mountCardFormAsync(): Promise<void> {
    if (
      !this.sdkReady ||
      !this.viewReady ||
      !this.mercadoPagoAvailable ||
      this.paymentChannel !== 'mercadopago' ||
      this.paymentMethod !== 'card' ||
      this.cardFormMounted ||
      !this.pendingOrder ||
      this.isLoadingPayment ||
      !this.cardFormVisible
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

    try {
      await this.mercadoPagoSdk.mountCardForm({
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
      this.cardFormMounted = true;
      this.cardFormMountAttempts = 0;
    } catch {
      this.cardFormMounted = false;
      if (this.cardFormMountAttempts < this.maxCardFormMountAttempts) {
        this.cardFormMountAttempts += 1;
        setTimeout(() => this.scheduleMountCardForm(), 250);
        return;
      }

      this.paymentError =
        'No se pudo inicializar el formulario de tarjeta. Recarga la página.';
    }
  }

  private submitCardPayment(data: MercadoPagoCardFormData): void {
    if (!this.pendingOrder || this.isPaying) {
      return;
    }

    if (!this.mercadoPagoAvailable) {
      this.paymentError =
        `El pago online requiere un subtotal mínimo de S/ ${this.mercadoPagoMinAmountLabel} en productos.`;
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

    const hasCheckoutToken = this.checkoutState.hasCheckoutToken();
    const isLoggedIn = this.authService.isLoggedIn();

    if (!hasCheckoutToken && !isLoggedIn) {
      this.paymentError =
        'Tu sesión de checkout expiró. Volvé al carrito e iniciá el checkout de nuevo.';
      return false;
    }

    return true;
  }

  private handleCheckoutExpired(): void {
    this.isPaying = false;
    this.checkoutExpired = true;
    const ttlLabel =
      this.pendingOrder?.payment_channel === 'whatsapp' ? '2 horas' : '15 min';
    this.paymentError =
      `Tu reserva expiró (${ttlLabel}). Volvé al carrito e iniciá el checkout de nuevo.`;
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
        this.invoiceData,
      );
      this.checkoutState.saveCompletedSummary(summary);
    }

    const orderId = this.pendingOrder?.id;
    const hadCheckoutToken = this.checkoutState.hasCheckoutToken();

    const finalize = (pendingActivation = false): void => {
      this.checkoutState.clearCheckoutToken();
      this.checkoutState.clear();
      this.cartService.clearGuestCartStorage();
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
      if (/invalid credentials/i.test(message) || message.includes('internal_error')) {
        return (
          'Mercado Pago rechazó el cobro. Si ya verificaste las credenciales, activá ' +
          'Credenciales productivas en el panel MP (Industria + URL), confirmá que la app es ' +
          'Checkout API y ejecutá "npm run verify:mercadopago" en el backend.'
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
