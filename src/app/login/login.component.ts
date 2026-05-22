import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  passwordType: string = 'password'; 
  private loginUrl =
    'https://ansurbackendnestjs-production.up.railway.app/auth/login';

  showEmptyFormError: boolean = false;
  showApiError: boolean = false;
  apiErrorMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.showEmptyFormError = true;
      return;
    }

    const loginData = {
      email: this.email,
      password: this.password,
    };

    this.http.post(this.loginUrl, loginData).subscribe({
      next: (response: any) => {
        this.router.navigate(['/inicio']);
        // console.log('Login éxito', response);
        localStorage.setItem('nombre', response.user.name);
        localStorage.setItem('apellidos', response.user.lastname);
        localStorage.setItem('token', response.token);
        localStorage.setItem('id', response.user.id);
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
