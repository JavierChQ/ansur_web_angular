import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CartService } from '../cart.service';
import {
  CheckoutDeliveryData,
  DELIVERY_FEE,
  DocType,
  ReceptorType,
  STORE_BUSINESS_HOURS,
  STORE_PICKUP_ADDRESS,
  getDeliveryFee,
} from '../models/checkout.model';
import { AUTH_ERROR_CODES } from '../models/auth.model';
import { IDENTITY_ERROR_CODES } from '../models/identity.model';
import { UbigeoDistrict, UbigeoProvince, UbigeoService } from '../services/ubigeo.service';
import { CheckoutFlowService } from '../services/checkout-flow.service';
import { CheckoutStateService } from '../services/checkout-state.service';
import { CheckoutOrder, OrderProductLine } from '../models/order.model';

@Component({
  selector: 'app-tipo-de-entrega',
  templateUrl: './tipo-de-entrega.component.html',
  styleUrls: ['./tipo-de-entrega.component.css'],
})
export class TipoDeEntregaComponent implements OnInit {
  activeSection: 'delivery' | 'pickup' = 'delivery';
  entregaForm: FormGroup;
  pickupForm: FormGroup;
  showErrorModal = false;
  products: any[] = [];
  subtotal = 0;
  deliveryFee = 0;
  totalAmount = 0;
  isSubmitting = false;
  checkoutError = '';

  departments: string[] = [];
  provinces: UbigeoProvince[] = [];
  districts: UbigeoDistrict[] = [];

  readonly deliveryFeeAmount = DELIVERY_FEE;
  readonly storeAddress = STORE_PICKUP_ADDRESS;
  readonly storeHours = STORE_BUSINESS_HOURS;

  readonly docTypes: { value: DocType; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'CE', label: 'Carnet de extranjería' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly cartService: CartService,
    private readonly checkoutFlowService: CheckoutFlowService,
    private readonly checkoutState: CheckoutStateService,
    private readonly ubigeoService: UbigeoService,
  ) {
    const savedDelivery = this.checkoutState.getDelivery();

    this.entregaForm = this.fb.group({
      departamento: [savedDelivery?.departamento ?? '', Validators.required],
      provincia: [savedDelivery?.provincia ?? '', Validators.required],
      distrito: [savedDelivery?.distrito ?? '', Validators.required],
      direccion: [savedDelivery?.direccion ?? '', Validators.required],
      referencia: [savedDelivery?.referencia ?? '', Validators.required],
      receptorTipo: [savedDelivery?.receptorTipo ?? 'yo'],
      receptorNombres: [savedDelivery?.receptor?.nombres ?? ''],
      receptorApellidos: [savedDelivery?.receptor?.apellidos ?? ''],
      receptorTipoDocumento: [savedDelivery?.receptor?.tipoDocumento ?? 'DNI'],
      receptorNumeroDocumento: [savedDelivery?.receptor?.numeroDocumento ?? ''],
    });

    this.pickupForm = this.fb.group({
      receptorTipo: [savedDelivery?.receptorTipo ?? 'yo'],
      receptorNombres: [savedDelivery?.receptor?.nombres ?? ''],
      receptorApellidos: [savedDelivery?.receptor?.apellidos ?? ''],
      receptorTipoDocumento: [savedDelivery?.receptor?.tipoDocumento ?? 'DNI'],
      receptorNumeroDocumento: [savedDelivery?.receptor?.numeroDocumento ?? ''],
    });

    this.updateReceptorValidators(this.entregaForm, this.entregaForm.get('receptorTipo')?.value);
    this.updateReceptorValidators(this.pickupForm, this.pickupForm.get('receptorTipo')?.value);
  }

  ngOnInit(): void {
    if (!this.checkoutState.getCustomer()) {
      this.router.navigate(['/datos-del-usuario']);
      return;
    }

    if (!this.checkoutState.getInvoice()?.validated) {
      this.router.navigate(['/datos-del-usuario']);
      return;
    }

    this.ubigeoService.getDepartments().subscribe((data) => {
      this.departments = data.map((item) => item.departamento);
      const departamento = this.entregaForm.get('departamento')?.value;
      if (departamento) {
        this.onDepartmentChange(departamento, false);
        const provincia = this.entregaForm.get('provincia')?.value;
        if (provincia) {
          this.onProvinceChange(provincia, false);
        }
      }
    });

    if (this.checkoutState.getDelivery()?.tipo === 'pickup') {
      this.activeSection = 'pickup';
    }

    const pendingOrder = this.checkoutState.getActiveOrder();
    if (pendingOrder) {
      this.applyOrderSummary(pendingOrder);
      return;
    }

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
      this.subtotal = cart?.total ?? 0;
      this.updateTotals();
    });
  }

  setActiveSection(section: 'delivery' | 'pickup'): void {
    this.activeSection = section;
    this.checkoutError = '';
    this.updateTotals();
  }

  isActive(section: 'delivery' | 'pickup'): boolean {
    return this.activeSection === section;
  }

  onDepartmentChange(departamento: string, resetChildren = true): void {
    if (resetChildren) {
      this.entregaForm.patchValue({ provincia: '', distrito: '' });
      this.districts = [];
    }

    this.ubigeoService.getProvinces(departamento).subscribe((provinces) => {
      this.provinces = provinces;
    });
  }

  onProvinceChange(provincia: string, resetDistrict = true): void {
    const departamento = this.entregaForm.get('departamento')?.value;
    if (resetDistrict) {
      this.entregaForm.patchValue({ distrito: '' });
    }

    this.ubigeoService.getDistricts(departamento, provincia).subscribe((districts) => {
      this.districts = districts;
    });
  }

  onDeliveryReceptorChange(value: ReceptorType): void {
    this.updateReceptorValidators(this.entregaForm, value);
  }

  onPickupReceptorChange(value: ReceptorType): void {
    this.updateReceptorValidators(this.pickupForm, value);
  }

  isOtraPersona(form: FormGroup): boolean {
    return form.get('receptorTipo')?.value === 'otra_persona';
  }

  onSubmitDelivery(): void {
    if (!this.entregaForm.valid) {
      this.showErrorModal = true;
      this.entregaForm.markAllAsTouched();
      return;
    }

    const delivery = this.buildDeliveryData('delivery', this.entregaForm);
    this.checkoutState.saveDelivery(delivery);
    this.startCheckout();
  }

  onSubmitPickup(): void {
    if (!this.pickupForm.valid) {
      this.showErrorModal = true;
      this.pickupForm.markAllAsTouched();
      return;
    }

    const delivery = this.buildDeliveryData('pickup', this.pickupForm);
    this.checkoutState.saveDelivery(delivery);
    this.startCheckout();
  }

  private buildDeliveryData(
    tipo: 'delivery' | 'pickup',
    form: FormGroup,
  ): CheckoutDeliveryData {
    const raw = form.getRawValue();
    const receptorTipo = raw.receptorTipo as ReceptorType;
    const delivery: CheckoutDeliveryData = {
      tipo,
      receptorTipo,
    };

    if (tipo === 'delivery') {
      delivery.departamento = raw.departamento;
      delivery.provincia = raw.provincia;
      delivery.distrito = raw.distrito;
      delivery.direccion = raw.direccion;
      delivery.referencia = raw.referencia;
    }

    if (receptorTipo === 'otra_persona') {
      delivery.receptor = {
        nombres: raw.receptorNombres,
        apellidos: raw.receptorApellidos,
        tipoDocumento: raw.receptorTipoDocumento,
        numeroDocumento: raw.receptorNumeroDocumento,
      };
    }

    return delivery;
  }

  private startCheckout(): void {
    this.isSubmitting = true;
    this.checkoutError = '';

    this.checkoutFlowService
      .startCheckoutFromState()
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (order) => {
          if (!order?.id) {
            this.checkoutError = 'No se recibió la orden. Intenta nuevamente.';
            return;
          }

          this.checkoutState.saveOrder(order);
          this.router.navigate(['/pagar']);
        },
        error: (error) => {
          this.checkoutError = this.mapCheckoutError(error);
        },
      });
  }

  private applyOrderSummary(order: CheckoutOrder): void {
    this.products = (order.orderHasProducts ?? []).map((line: OrderProductLine) => ({
      name: line.product?.name ?? `Producto #${line.id_product}`,
      sales_price: Number(line.product?.sale_price ?? line.unit_price ?? 0),
      quantity: line.quantity,
      image: line.product?.image1,
    }));
    this.subtotal = this.products.reduce(
      (sum, product) => sum + product.sales_price * product.quantity,
      0,
    );
    this.updateTotals();
  }

  private updateTotals(): void {
    this.deliveryFee = getDeliveryFee(this.activeSection);
    this.totalAmount = this.subtotal + this.deliveryFee;
  }

  private updateReceptorValidators(form: FormGroup, receptorTipo: ReceptorType): void {
    const isOtra = receptorTipo === 'otra_persona';
    const controls = [
      'receptorNombres',
      'receptorApellidos',
      'receptorTipoDocumento',
      'receptorNumeroDocumento',
    ];

    controls.forEach((name) => {
      const control = form.get(name);
      if (!control) {
        return;
      }
      if (isOtra) {
        control.setValidators(Validators.required);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity();
    });
  }

  private mapCheckoutError(error: {
    status?: number;
    error?: { message?: string | string[]; code?: string };
  }): string {
    const code = error?.error?.code;
    if (code === AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED) {
      const customer = this.checkoutState.getCustomer();
      void this.router.navigate(['/datos-del-usuario'], {
        queryParams: {
          requireLogin: '1',
          email: customer?.email ?? '',
        },
      });
      return 'Este correo ya tiene cuenta. Inicia sesión para continuar.';
    }

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
    if (error?.status === 503) {
      return 'No se pudo validar el comprobante en este momento. Intenta nuevamente más tarde.';
    }
    if (
      code === IDENTITY_ERROR_CODES.SERVICE_UNAVAILABLE ||
      code === IDENTITY_ERROR_CODES.PROVIDER_NOT_CONFIGURED ||
      code === IDENTITY_ERROR_CODES.INVOICE_DATA_MISMATCH
    ) {
      return typeof message === 'string' && message.trim()
        ? message
        : 'No se pudo validar el comprobante. Revisa los datos e intenta nuevamente.';
    }
    if (error?.status === 400) {
      const message = typeof error?.error?.message === 'string' ? error.error.message : '';
      if (message.includes('vacío') || message.includes('incompletos')) {
        return message;
      }
      return 'El carrito está vacío o los datos de envío no son válidos.';
    }
    if (error?.status === 401) {
      return 'Tu sesión no es válida. Cierra sesión e intenta de nuevo, o continúa como invitado.';
    }
    return 'No se pudo iniciar el checkout. Intenta nuevamente.';
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
  }
}
