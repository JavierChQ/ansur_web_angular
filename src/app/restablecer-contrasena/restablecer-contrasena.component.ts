import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-restablecer-contrasena',
  templateUrl: './restablecer-contrasena.component.html',
  styleUrls: ['./restablecer-contrasena.component.css'],
})
export class RestablecerContrasenaComponent implements OnInit {
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
      this.errorMessage = 'El enlace no es válido. Solicita uno nuevo desde recuperar contraseña.';
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

    this.apiService.resetPassword({ token: this.token, password }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage =
          'Contraseña actualizada correctamente. Redirigiendo al login...';
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
    this.router.navigate(['/recuperar-contrasena']);
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
    return 'No se pudo restablecer la contraseña. Intenta nuevamente.';
  }
}
