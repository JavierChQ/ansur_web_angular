import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { CheckoutCustomerData, DocType } from '../models/checkout.model';
import { CheckoutStateService } from '../services/checkout-state.service';
import { ApiService } from '../services/api.service';
import { getDeliveryFee } from '../models/checkout.model';

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

  readonly docTypes: { value: DocType; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'CE', label: 'Carnet de extranjería' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
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
        this.loginError = this.getLoginErrorMessage(error?.status);
      },
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.showErrorModal = true;
      this.userForm.markAllAsTouched();
      return;
    }

    const customer = this.userForm.getRawValue() as CheckoutCustomerData;
    this.checkoutState.saveCustomer(customer);
    this.router.navigate(['/tipo-de-entrega']);
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

  private getLoginErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 404:
        return 'No existe una cuenta con ese correo electrónico.';
      case 403:
        return 'La contraseña es incorrecta.';
      default:
        return 'No se pudo iniciar sesión. Intenta nuevamente.';
    }
  }
}
