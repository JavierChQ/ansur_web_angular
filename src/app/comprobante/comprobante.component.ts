import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // Importa el Router

@Component({
  selector: 'app-comprobante',
  templateUrl: './comprobante.component.html',
  styleUrls: ['./comprobante.component.css']
})
export class ComprobanteComponent {
  comprobanteForm: FormGroup;
  showErrorModal: boolean = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.comprobanteForm = this.fb.group({
      tipoDocumento: ['', Validators.required],
      numeroDocumento: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit() {
    if (this.comprobanteForm.valid) {
      this.router.navigate(['/tipo-de-entrega']);
    } else {
      this.showErrorModal = true;
      this.comprobanteForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}
