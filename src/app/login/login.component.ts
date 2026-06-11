import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  passwordType: string = 'password';

  showEmptyFormError: boolean = false;
  showApiError: boolean = false;
  apiErrorMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService,
    private cartService: CartService,
  ) {}

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
        this.router.navigate(['/inicio']);
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

        this.cartService.syncAfterLogin().subscribe();
      },
      error: (error) => {
        console.error('Error', error);
        this.showApiError = true;
        this.apiErrorMessage = this.getErrorMessage(error.status);
      },
    });
  }

  getErrorMessage(statusCode: number): string {
    switch (statusCode) {
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
