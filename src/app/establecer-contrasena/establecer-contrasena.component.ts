import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-establecer-contrasena',
  templateUrl: './establecer-contrasena.component.html',
  styleUrls: ['./establecer-contrasena.component.css'],
})
export class EstablecerContrasenaComponent implements OnInit {
  form: FormGroup;
  token = '';
  passwordType: 'password' | 'text' = 'password';
  confirmPasswordType: 'password' | 'text' = 'password';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
  ) {
    this.form = this.fb.group({
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

    if (!this.token) {
      this.errorMessage = 'El enlace no es válido. Solicita uno nuevo desde tu correo.';
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
      return;
    }
    this.confirmPasswordType =
      this.confirmPasswordType === 'password' ? 'text' : 'password';
  }

  onSubmit(): void {
    if (!this.token) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.get('password')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.setPassword({ token: this.token, password }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Contraseña creada correctamente. Redirigiendo al login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = this.mapError(error);
      },
    });
  }

  requestNewLink(): void {
    this.router.navigate(['/login'], { queryParams: { resendActivation: '1' } });
  }

  private mapError(error: {
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
    if (error?.status === 410) {
      return 'El enlace expiró. Solicita uno nuevo.';
    }
    return 'No se pudo crear la contraseña. Intenta nuevamente.';
  }
}
