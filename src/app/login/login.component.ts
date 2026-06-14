import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { ApiService } from '../services/api.service';
import { AUTH_ERROR_CODES } from '../models/auth.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  passwordType: string = 'password';

  showEmptyFormError: boolean = false;
  showApiError: boolean = false;
  apiErrorMessage: string = '';
  showPasswordNotSetHint = false;
  showResendPanel = false;
  isResending = false;
  resendMessage = '';
  resendError = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private cartService: CartService,
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('resendActivation') === '1') {
      this.showResendPanel = true;
    }
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.showEmptyFormError = true;
      return;
    }

    const loginData = {
      email: this.email,
      password: this.password,
    };

    this.apiService.login(loginData).subscribe({
      next: (response: any) => {
        // guardar token y datos de usuario
        if (response && response.token) {
          this.authService.login(response.token);
          localStorage.setItem('token', response.token);
        }
        if (response && response.user) {
          this.authService.setUser(response.user);
          localStorage.setItem('nombre', response.user.name || '');
          localStorage.setItem('apellidos', response.user.lastname || '');
          localStorage.setItem('id', response.user.id || '');
        }

        this.cartService.syncAfterLogin().subscribe({
          next: () => this.navigateAfterLogin(),
        });
      },
      error: (error) => {
        console.error('Error', error);
        this.showApiError = true;
        this.apiErrorMessage = this.getErrorMessage(error);
        this.showPasswordNotSetHint =
          error?.error?.code === AUTH_ERROR_CODES.PASSWORD_NOT_SET;
      },
    });
  }

  resendActivationEmail(): void {
    if (!this.email?.trim()) {
      this.resendError = 'Ingresa tu correo electrónico.';
      return;
    }

    this.isResending = true;
    this.resendError = '';
    this.resendMessage = '';

    this.apiService.resendSetPassword(this.email.trim()).subscribe({
      next: (response) => {
        this.isResending = false;
        this.resendMessage = response.message;
      },
      error: (error) => {
        this.isResending = false;
        this.resendError =
          error?.error?.message ??
          'No se pudo enviar el correo. Intenta nuevamente en unos minutos.';
      },
    });
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigate(returnUrl ? [returnUrl] : ['/inicio']);
  }

  getErrorMessage(error: {
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
        return 'Ha ocurrido un error inesperado. Intenta nuevamente.';
    }
  }

  togglePasswordVisibility() {
    this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
  }
}
