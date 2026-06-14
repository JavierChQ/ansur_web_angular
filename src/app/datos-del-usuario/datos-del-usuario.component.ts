import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { CheckoutCustomerData, DocType } from '../models/checkout.model';
import { AUTH_ERROR_CODES } from '../models/auth.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { ApiService } from '../services/api.service';

type CheckoutMode = 'guest' | 'login';

@Component({
  selector: 'app-datos-del-usuario',
  templateUrl: './datos-del-usuario.component.html',
  styleUrls: ['./datos-del-usuario.component.css'],
})
export class DatosDelUsuarioComponent implements OnInit {
  mode: CheckoutMode = 'guest';
  userForm: FormGroup;
  loginForm: FormGroup;
  showErrorModal = false;
  products: any[] = [];
  subtotal = 0;
  loginError = '';
  isLoggingIn = false;
  emailRegisteredMessage = '';
  isCheckingEmail = false;

  readonly docTypes: { value: DocType; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'CE', label: 'Carnet de extranjería' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
  ) {
    const saved = this.checkoutState.getCustomer();
    const nombre = saved?.nombres ?? localStorage.getItem('nombre') ?? '';
    const apellidos = saved?.apellidos ?? localStorage.getItem('apellidos') ?? '';

    this.userForm = this.fb.group({
      email: [saved?.email ?? this.authService.getUserEmail(), [Validators.required, Validators.email]],
      nombres: [nombre, Validators.required],
      apellidos: [apellidos, Validators.required],
      tipoDocumento: [saved?.tipoDocumento ?? 'DNI', Validators.required],
      numeroDocumento: [saved?.numeroDocumento ?? '', Validators.required],
      celular: [saved?.celular ?? '', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.prefillFromLoggedUser();
    }

    this.handleRequireLoginQueryParams();

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
            this.prefillFromLoggedUser();
            this.setMode('guest');
          },
          error: () => {
            this.isLoggingIn = false;
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
    const emailControl = this.userForm.get('email');
    const email = emailControl?.value?.trim();

    if (!email || emailControl?.invalid) {
      this.emailRegisteredMessage = '';
      return;
    }

    this.checkEmailRegistration(email);
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.showErrorModal = true;
      this.userForm.markAllAsTouched();
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
        this.continueAsGuest();
      },
      error: () => {
        this.isCheckingEmail = false;
        this.continueAsGuest();
      },
    });
  }

  closeModal(): void {
    this.showErrorModal = false;
  }

  private prefillFromLoggedUser(): void {
    const user = this.authService.getUser();
    if (!user) {
      return;
    }

    this.userForm.patchValue({
      email: user.email ?? this.authService.getUserEmail(),
      nombres: user.name ?? localStorage.getItem('nombre') ?? '',
      apellidos: user.lastname ?? localStorage.getItem('apellidos') ?? '',
      celular: user.phone ?? this.userForm.get('celular')?.value,
    });
  }

  private continueAsGuest(): void {
    const customer = this.userForm.getRawValue() as CheckoutCustomerData;
    this.checkoutState.saveCustomer(customer);
    this.router.navigate(['/tipo-de-entrega']);
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
