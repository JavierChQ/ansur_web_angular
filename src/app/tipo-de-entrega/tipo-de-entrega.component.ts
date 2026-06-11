import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../cart.service';
import { CheckoutFlowService } from '../services/checkout-flow.service';
import { CheckoutStateService } from '../services/checkout-state.service';

@Component({
  selector: 'app-tipo-de-entrega',
  templateUrl: './tipo-de-entrega.component.html',
  styleUrls: ['./tipo-de-entrega.component.css'],
})
export class TipoDeEntregaComponent implements OnInit {
  activeSection: 'delivery' | 'pickup' = 'delivery';
  entregaForm: FormGroup;
  showErrorModal = false;
  products: any[] = [];
  totalAmount = 0;
  isSubmitting = false;
  checkoutError = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cartService: CartService,
    private checkoutFlowService: CheckoutFlowService,
    private checkoutState: CheckoutStateService,
  ) {
    this.entregaForm = this.fb.group({
      direccion: ['', Validators.required],
      referencia: ['', Validators.required],
      nombreReceptor: ['', Validators.required],
      telefono: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.cartService.refreshCart().subscribe((cart) => {
      const items = cart?.items ?? [];
      if (!items.length) {
        this.router.navigate(['/cart']);
        return;
      }

      this.products = items.map((item) => ({
        name: item.name,
        sales_price: item.sales_price,
        quantity: item.quantity,
        image: this.cartService.getDisplayItems().find(
          (displayItem) => displayItem.id_product === item.id_product,
        )?.image,
      }));
      this.totalAmount = cart?.total ?? 0;
    });
  }

  setActiveSection(section: 'delivery' | 'pickup'): void {
    this.activeSection = section;
    this.checkoutError = '';
  }

  isActive(section: 'delivery' | 'pickup'): boolean {
    return this.activeSection === section;
  }

  onSubmit(): void {
    if (!this.entregaForm.valid) {
      this.showErrorModal = true;
      this.entregaForm.markAllAsTouched();
      return;
    }

    this.startCheckout(
      this.checkoutFlowService.startDeliveryCheckout(this.entregaForm.getRawValue()),
    );
  }

  continuePickup(): void {
    this.startCheckout(this.checkoutFlowService.startPickupCheckout());
  }

  private startCheckout(request$: ReturnType<CheckoutFlowService['startDeliveryCheckout']>): void {
    this.isSubmitting = true;
    this.checkoutError = '';

    request$.subscribe({
      next: (order) => {
        this.checkoutState.save(order);
        this.isSubmitting = false;
        this.router.navigate(['/pagar']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.checkoutError = this.mapCheckoutError(error);
      },
    });
  }

  private mapCheckoutError(error: {
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
    if (error?.status === 409) {
      return 'No hay stock suficiente para completar la compra.';
    }
    if (error?.status === 400) {
      return 'El carrito está vacío o los datos de envío no son válidos.';
    }
    return 'No se pudo iniciar el checkout. Intenta nuevamente.';
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }
}
