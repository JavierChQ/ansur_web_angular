import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import {
  CheckoutCustomerData,
  CheckoutInvoiceData,
  DocType,
  InvoiceType,
} from '../models/checkout.model';
import { CheckoutOrder, OrderProductLine } from '../models/order.model';
import { AUTH_ERROR_CODES } from '../models/auth.model';
import { IDENTITY_ERROR_CODES } from '../models/identity.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { ApiService } from '../services/api.service';
import { IdentityService } from '../services/identity.service';

type CheckoutMode = 'guest' | 'login';

@Component({
  selector: 'app-datos-del-usuario',
  templateUrl: './datos-del-usuario.component.html',
  styleUrls: ['./datos-del-usuario.component.css'],
})
export class DatosDelUsuarioComponent implements OnInit, OnDestroy {
  mode: CheckoutMode = 'guest';
  isLoggedIn = false;
  userForm: FormGroup;
  loginForm: FormGroup;
  showErrorModal = false;
  modalErrorMessage = '';
  products: any[] = [];
  subtotal = 0;
  loginError = '';
  isLoggingIn = false;
  emailRegisteredMessage = '';
  isCheckingEmail = false;
  identityError = '';
  isLookingUp = false;
  isInvoiceValidated = false;

  readonly docTypes: { value: DocType; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'CE', label: 'Carnet de extranjería' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
    private readonly identityService: IdentityService,
  ) {
    const saved = this.checkoutState.getCustomer();
    const savedInvoice = this.checkoutState.getInvoice();

    this.userForm = this.fb.group({
      email: [saved?.email ?? '', [Validators.required, Validators.email]],
      nombres: [saved?.nombres ?? '', Validators.required],
      apellidos: [saved?.apellidos ?? '', Validators.required],
      tipoDocumento: [saved?.tipoDocumento ?? 'DNI', Validators.required],
      numeroDocumento: [saved?.numeroDocumento ?? '', Validators.required],
      celular: [saved?.celular ?? '', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      invoiceTipo: [savedInvoice?.tipo ?? 'BOLETA', Validators.required],
      invoiceNumeroDocumento: [
        savedInvoice?.numeroDocumento ?? '',
        [Validators.required, Validators.pattern(/^\d+$/)],
      ],
      invoiceNombreTitular: [{ value: savedInvoice?.nombreTitular ?? '', disabled: true }],
      invoiceRazonSocial: [{ value: savedInvoice?.razonSocial ?? '', disabled: true }],
      invoiceDomicilioFiscal: [{ value: savedInvoice?.domicilioFiscal ?? '', disabled: true }],
    });

    this.isInvoiceValidated = savedInvoice?.validated ?? false;
    this.applyInvoiceDocumentValidators(savedInvoice?.tipo ?? 'BOLETA');

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn) {
      this.prefillFromLoggedUser();
      this.mode = 'guest';
    }

    this.handleRequireLoginQueryParams();

    this.userForm
      .get('invoiceTipo')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((tipo: InvoiceType) => {
        this.resetInvoiceValidation();
        this.applyInvoiceDocumentValidators(tipo);
      });

    const pendingOrder = this.checkoutState.getActiveOrder();
    if (pendingOrder) {
      this.applyOrderSummary(pendingOrder);
      return;
    }

    this.cartService.refreshCart().subscribe((cart) => {
      const items = cart?.items ?? [];
      if (!items.length) {
        this.router.navigate(['/cart']);
        return;
      }

      this.products = items.map((item) => ({
        title: item.name,
        unit_price: item.sales_price,
        quantity: item.quantity,
        image1: this.cartService.getDisplayItems().find(
          (displayItem) => displayItem.id_product === item.id_product,
        )?.image,
      }));
      this.subtotal = cart?.total ?? 0;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isBoleta(): boolean {
    return this.userForm.get('invoiceTipo')?.value === 'BOLETA';
  }

  get isFactura(): boolean {
    return this.userForm.get('invoiceTipo')?.value === 'FACTURA';
  }

  get canUseCustomerDniForInvoice(): boolean {
    return (
      this.userForm.get('tipoDocumento')?.value === 'DNI' &&
      !!this.userForm.get('numeroDocumento')?.value
    );
  }

  setMode(mode: CheckoutMode): void {
    this.mode = mode;
    this.loginError = '';
    if (mode === 'guest') {
      this.emailRegisteredMessage = '';
    }
  }

  goToRegister(): void {
    this.router.navigate(['/registrate'], {
      queryParams: { returnUrl: '/datos-del-usuario' },
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoggingIn = true;
    this.loginError = '';

    this.apiService.login(this.loginForm.getRawValue()).subscribe({
      next: (response: any) => {
        if (response?.token) {
          this.authService.login(response.token);
          localStorage.setItem('token', response.token);
        }
        if (response?.user) {
          this.authService.setUser(response.user);
          localStorage.setItem('nombre', response.user.name || '');
          localStorage.setItem('apellidos', response.user.lastname || '');
          localStorage.setItem('id', response.user.id || '');
        }

        this.cartService.syncAfterLogin().subscribe({
          next: () => {
            this.isLoggingIn = false;
            this.isLoggedIn = true;
            this.prefillFromLoggedUser();
            this.setMode('guest');
          },
          error: () => {
            this.isLoggingIn = false;
            this.isLoggedIn = true;
            this.prefillFromLoggedUser();
            this.setMode('guest');
          },
        });
      },
      error: (error) => {
        this.isLoggingIn = false;
        this.loginError = this.getLoginErrorMessage(error);
      },
    });
  }

  onEmailBlur(): void {
    if (this.isLoggedIn) {
      return;
    }

    const emailControl = this.userForm.get('email');
    const email = emailControl?.value?.trim();

    if (!email || emailControl?.invalid) {
      this.emailRegisteredMessage = '';
      return;
    }

    this.checkEmailRegistration(email);
  }

  onInvoiceDocumentInput(): void {
    this.resetInvoiceValidation(false);
  }

  onInvoiceDocumentBlur(): void {
    void this.lookupInvoiceDocument();
  }

  useCustomerDniForInvoice(): void {
    if (!this.canUseCustomerDniForInvoice) {
      return;
    }

    this.userForm.patchValue({
      invoiceTipo: 'BOLETA',
      invoiceNumeroDocumento: this.userForm.get('numeroDocumento')?.value,
    });
    this.applyInvoiceDocumentValidators('BOLETA');
    void this.lookupInvoiceDocument();
  }

  onSubmit(): void {
    if (this.userForm.invalid || !this.isInvoiceValidated) {
      this.showErrorModal = true;
      this.userForm.markAllAsTouched();
      this.modalErrorMessage = !this.isInvoiceValidated
        ? 'Debes validar el documento del comprobante con la consulta oficial antes de continuar.'
        : 'Por favor, completa todos los campos requeridos antes de continuar.';
      return;
    }

    if (this.isLoggedIn) {
      this.continueCheckout();
      return;
    }

    const email = this.userForm.get('email')?.value?.trim();
    if (!email) {
      return;
    }

    this.isCheckingEmail = true;
    this.apiService.getEmailStatus(email).subscribe({
      next: (status) => {
        this.isCheckingEmail = false;
        if (status.requires_login) {
          this.promptLoginWithEmail(email, status.password_not_set);
          return;
        }
        this.continueCheckout();
      },
      error: () => {
        this.isCheckingEmail = false;
        this.continueCheckout();
      },
    });
  }

  closeModal(): void {
    this.showErrorModal = false;
    this.modalErrorMessage = '';
  }

  invoiceControlInvalid(controlName: string): boolean {
    const control = this.userForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getInvoiceDocumentError(control: AbstractControl | null): string {
    if (!control?.errors) {
      return 'Este campo es obligatorio';
    }

    if (control.errors['pattern']) {
      return this.isBoleta
        ? 'Ingresa un DNI válido de 8 dígitos'
        : 'Ingresa un RUC válido de 11 dígitos';
    }

    return 'Este campo es obligatorio';
  }

  private applyOrderSummary(order: CheckoutOrder): void {
    this.products = (order.orderHasProducts ?? []).map((line: OrderProductLine) => ({
      title: line.product?.name ?? `Producto #${line.id_product}`,
      unit_price: Number(line.product?.sale_price ?? line.unit_price ?? 0),
      quantity: line.quantity,
      image1: line.product?.image1,
    }));
    this.subtotal = this.products.reduce(
      (sum, product) => sum + product.unit_price * product.quantity,
      0,
    );
  }

  private prefillFromLoggedUser(): void {
    const user = this.authService.getUser();
    if (!user) {
      return;
    }

    this.userForm.patchValue({
      email: user.email ?? this.authService.getUserEmail(),
      nombres: user.name ?? '',
      apellidos: user.lastname ?? '',
      celular: user.phone ?? this.userForm.get('celular')?.value,
    });
  }

  private continueCheckout(): void {
    const raw = this.userForm.getRawValue();
    const customer: CheckoutCustomerData = {
      email: raw.email,
      nombres: raw.nombres,
      apellidos: raw.apellidos,
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: raw.numeroDocumento,
      celular: raw.celular,
    };

    const invoice: CheckoutInvoiceData = {
      tipo: raw.invoiceTipo,
      numeroDocumento: raw.invoiceNumeroDocumento.trim(),
      nombreTitular: raw.invoiceNombreTitular?.trim() || undefined,
      razonSocial: raw.invoiceRazonSocial?.trim() || undefined,
      domicilioFiscal: raw.invoiceDomicilioFiscal?.trim() || undefined,
      validated: true,
    };

    this.checkoutState.saveCustomer(customer);
    this.checkoutState.saveInvoice(invoice);
    this.checkoutState.clearOrder();
    this.router.navigate(['/tipo-de-entrega']);
  }

  private lookupInvoiceDocument(): void {
    const tipo = this.userForm.get('invoiceTipo')?.value as InvoiceType;
    const numeroDocumento = this.userForm.get('invoiceNumeroDocumento')?.value?.trim() ?? '';
    const expectedLength = tipo === 'BOLETA' ? 8 : 11;

    this.identityError = '';

    if (!new RegExp(`^\\d{${expectedLength}}$`).test(numeroDocumento)) {
      return;
    }

    this.isLookingUp = true;
    this.resetInvoiceValidation(false);

    if (tipo === 'BOLETA') {
      this.identityService
        .lookupDni(numeroDocumento)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLookingUp = false;
            this.userForm.patchValue({
              invoiceNombreTitular: response.nombre_completo,
              invoiceRazonSocial: '',
              invoiceDomicilioFiscal: '',
            });
            this.isInvoiceValidated = true;
          },
          error: (error: unknown) => {
            this.isLookingUp = false;
            this.isInvoiceValidated = false;
            this.identityError = this.mapIdentityError(
              error as { status?: number; error?: { code?: string; message?: string | string[] } },
            );
          },
        });
      return;
    }

    this.identityService
      .lookupRuc(numeroDocumento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLookingUp = false;
          this.userForm.patchValue({
            invoiceNombreTitular: '',
            invoiceRazonSocial: response.razon_social,
            invoiceDomicilioFiscal: response.direccion,
          });
          this.isInvoiceValidated = true;
        },
        error: (error: unknown) => {
          this.isLookingUp = false;
          this.isInvoiceValidated = false;
          this.identityError = this.mapIdentityError(
            error as { status?: number; error?: { code?: string; message?: string | string[] } },
          );
        },
      });
  }

  private resetInvoiceValidation(clearDocument = true): void {
    this.isInvoiceValidated = false;
    this.identityError = '';

    if (clearDocument) {
      this.userForm.patchValue({
        invoiceNumeroDocumento: '',
        invoiceNombreTitular: '',
        invoiceRazonSocial: '',
        invoiceDomicilioFiscal: '',
      });
    } else {
      this.userForm.patchValue({
        invoiceNombreTitular: '',
        invoiceRazonSocial: '',
        invoiceDomicilioFiscal: '',
      });
    }
  }

  private applyInvoiceDocumentValidators(tipo: InvoiceType): void {
    const control = this.userForm.get('invoiceNumeroDocumento');
    if (!control) {
      return;
    }

    const length = tipo === 'BOLETA' ? 8 : 11;
    control.setValidators([
      Validators.required,
      Validators.pattern(new RegExp(`^\\d{${length}}$`)),
    ]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private mapIdentityError(error: {
    status?: number;
    error?: { code?: string; message?: string | string[] };
  }): string {
    const code = error?.error?.code;
    const message = error?.error?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length) {
      return message.join(', ');
    }

    switch (code) {
      case IDENTITY_ERROR_CODES.INVALID_DNI_FORMAT:
        return 'El DNI debe tener exactamente 8 dígitos numéricos.';
      case IDENTITY_ERROR_CODES.INVALID_RUC_FORMAT:
        return 'El RUC debe tener exactamente 11 dígitos numéricos.';
      case IDENTITY_ERROR_CODES.DNI_NOT_FOUND:
        return 'No se encontró información para el DNI ingresado.';
      case IDENTITY_ERROR_CODES.RUC_NOT_FOUND:
        return 'No se encontró información para el RUC ingresado.';
      case IDENTITY_ERROR_CODES.RUC_NOT_ACTIVE:
        return 'El RUC no se encuentra activo y habido.';
      case IDENTITY_ERROR_CODES.SERVICE_UNAVAILABLE:
      case IDENTITY_ERROR_CODES.PROVIDER_NOT_CONFIGURED:
        return 'No se pudo validar el documento en este momento. Intenta nuevamente más tarde.';
      default:
        if (error?.status === 503) {
          return 'No se pudo validar el documento en este momento. Intenta nuevamente más tarde.';
        }
        if (error?.status === 404) {
          return 'No se encontró información para el documento ingresado.';
        }
        return 'No se pudo validar el documento. Revisa el número e intenta nuevamente.';
    }
  }

  private checkEmailRegistration(email: string): void {
    this.isCheckingEmail = true;
    this.apiService.getEmailStatus(email).subscribe({
      next: (status) => {
        this.isCheckingEmail = false;
        if (status.requires_login) {
          this.emailRegisteredMessage = status.password_not_set
            ? 'Este correo tiene una cuenta pendiente de activación. Cuando definas tu contraseña podrás iniciar sesión.'
            : 'Este correo ya tiene cuenta. Inicia sesión para completar tu compra.';
          return;
        }
        this.emailRegisteredMessage = '';
      },
      error: () => {
        this.isCheckingEmail = false;
        this.emailRegisteredMessage = '';
      },
    });
  }

  promptLoginFromAlert(): void {
    const email = this.userForm.get('email')?.value?.trim();
    if (!email) {
      this.setMode('login');
      return;
    }
    this.promptLoginWithEmail(email);
  }

  private promptLoginWithEmail(email: string, passwordNotSet?: boolean): void {
    this.loginForm.patchValue({ email });
    this.emailRegisteredMessage = passwordNotSet
      ? 'Este correo tiene una cuenta pendiente de activación. Cuando definas tu contraseña podrás iniciar sesión.'
      : 'Este correo ya tiene cuenta. Inicia sesión para completar tu compra.';
    this.setMode('login');
  }

  private handleRequireLoginQueryParams(): void {
    const requireLogin = this.route.snapshot.queryParamMap.get('requireLogin');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (requireLogin !== '1' || !email) {
      return;
    }

    this.promptLoginWithEmail(email);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { requireLogin: null, email: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getLoginErrorMessage(error: {
    status?: number;
    error?: { code?: string; message?: string };
  }): string {
    if (error?.error?.code === AUTH_ERROR_CODES.PASSWORD_NOT_SET) {
      return (
        error.error.message ??
        'Tu cuenta aún no tiene contraseña. Revisa tu correo para activarla.'
      );
    }

    switch (error?.status) {
      case 404:
        return 'No existe una cuenta con ese correo electrónico.';
      case 403:
        return 'La contraseña es incorrecta.';
      default:
        return 'No se pudo iniciar sesión. Intenta nuevamente.';
    }
  }
}
