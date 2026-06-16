import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-recuperar-contrasena',
  templateUrl: './recuperar-contrasena.component.html',
  styleUrls: ['./recuperar-contrasena.component.css'],
})
export class RecuperarContrasenaComponent {
  form: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly apiService: ApiService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.form.get('email')?.value?.trim();

    this.apiService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message;
        this.form.disable();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ??
          'No se pudo procesar la solicitud. Intenta nuevamente en unos minutos.';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
