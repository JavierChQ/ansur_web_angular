import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css'],
})
export class ContactoComponent {
  contactoForm: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    // Crear el formulario
    this.contactoForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
      mensaje: ['', Validators.required],
      terminos: [false, Validators.requiredTrue],
    });
  }

  onSubmit() {
    if (this.contactoForm.valid) {
      const formData = this.contactoForm.value;
      formData.terminos = formData.terminos ? 'sí' : 'no';
      this.http
        .post(
          'https://formsubmit.co/ajax/gabrielyorb@hotmail.com',
          formData
        )
        .subscribe(
          (response) => {
            this.successMessage = 'Formulario enviado con éxito.';
            this.errorMessage = null;
            this.contactoForm.reset();
          },
          (error) => {
            this.errorMessage =
              'Error al enviar el formulario. Intenta nuevamente.';
            this.successMessage = null;
          }
        );
    } else {
      this.errorMessage = 'Por favor, completa todos los campos requeridos.';
      this.successMessage = null;
    }
  }

  closeModal() {
    this.successMessage = null;
    this.errorMessage = null;
  }
}
