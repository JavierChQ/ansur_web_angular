import { Injectable } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import {
  AuthenticatedCheckoutPayload,
  CheckoutCustomerData,
  CheckoutDeliveryData,
  DELIVERY_FEE,
  GuestCheckoutPayload,
  GuestCheckoutResponse,
  STORE_PICKUP_ADDRESS,
} from '../models/checkout.model';
import { CheckoutOrder } from '../models/order.model';
import { AddressService } from './address.service';
import { CheckoutService } from './checkout.service';
import { CheckoutStateService } from './checkout-state.service';

@Injectable({
  providedIn: 'root',
})
export class CheckoutFlowService {
  constructor(
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
    private readonly checkoutState: CheckoutStateService,
  ) {}

  startCheckoutFromState(): Observable<CheckoutOrder> {
    const customer = this.checkoutState.getCustomer();
    const delivery = this.checkoutState.getDelivery();

    if (!customer || !delivery) {
      return throwError(() => ({
        status: 400,
        error: { message: 'Datos de checkout incompletos' },
      }));
    }

    if (this.shouldUseAuthenticatedCheckout()) {
      const addressPayload = this.buildAddressStrings(customer, delivery);
      const userId = this.authService.getUserId()!;

      return this.addressService
        .create({
          address: addressPayload.address,
          district: addressPayload.district,
          id_user: userId,
        })
        .pipe(
          switchMap((created) =>
            this.checkoutService.startCheckout({
              id_address: created.id,
              customer: this.mapCustomer(customer),
              delivery: this.mapDelivery(delivery),
            }),
          ),
        );
    }

    const items = this.cartService.getCheckoutItems();
    if (!items.length) {
      return throwError(() => ({
        status: 400,
        error: { message: 'El carrito está vacío.' },
      }));
    }

    const payload = this.buildGuestPayload(customer, delivery, items);

    return this.checkoutService.guestCheckout(payload).pipe(
      map((response) => {
        this.applyGuestCheckoutToken(response);
        return response.order;
      }),
    );
  }

  private shouldUseAuthenticatedCheckout(): boolean {
    return (
      this.authService.isLoggedIn() &&
      !!this.authService.getUserId() &&
      !this.cartService.isLocalCart()
    );
  }

  private buildGuestPayload(
    customer: CheckoutCustomerData,
    delivery: CheckoutDeliveryData,
    items: { id_product: number; quantity: number }[],
  ): GuestCheckoutPayload {
    return {
      items,
      customer: this.mapCustomer(customer),
      delivery: this.mapDelivery(delivery),
    };
  }

  private mapCustomer(customer: CheckoutCustomerData): AuthenticatedCheckoutPayload['customer'] {
    return {
      email: customer.email,
      name: customer.nombres,
      lastname: customer.apellidos,
      phone: customer.celular,
      doc_type: customer.tipoDocumento,
      doc_number: customer.numeroDocumento,
    };
  }

  private mapDelivery(delivery: CheckoutDeliveryData): AuthenticatedCheckoutPayload['delivery'] {
    const receptor =
      delivery.receptorTipo === 'otra_persona' && delivery.receptor
        ? {
            nombres: delivery.receptor.nombres,
            apellidos: delivery.receptor.apellidos,
            doc_type: delivery.receptor.tipoDocumento,
            doc_number: delivery.receptor.numeroDocumento,
          }
        : undefined;

    return {
      type: delivery.tipo,
      departamento: delivery.departamento,
      provincia: delivery.provincia,
      distrito: delivery.distrito,
      direccion: delivery.direccion,
      referencia: delivery.referencia,
      receptor_type: delivery.receptorTipo,
      receptor,
    };
  }

  private buildAddressStrings(
    customer: CheckoutCustomerData,
    delivery: CheckoutDeliveryData,
  ): { address: string; district: string } {
    const receptor = this.resolveReceptor(customer, delivery);

    if (delivery.tipo === 'pickup') {
      return {
        address: [
          'Retiro en tienda',
          STORE_PICKUP_ADDRESS,
          `Cliente: ${customer.nombres} ${customer.apellidos}`,
          `Receptor: ${receptor.name}`,
          `Doc receptor: ${receptor.docType} ${receptor.docNumber}`,
          `Tel: ${customer.celular}`,
        ].join(' | '),
        district: 'Arequipa',
      };
    }

    return {
      address: [
        delivery.direccion,
        `${delivery.distrito}, ${delivery.provincia}, ${delivery.departamento}`,
        `Ref: ${delivery.referencia}`,
        `Receptor: ${receptor.name}`,
        `Doc receptor: ${receptor.docType} ${receptor.docNumber}`,
        `Tel: ${customer.celular}`,
      ].join(' | '),
      district: delivery.distrito ?? 'Arequipa',
    };
  }

  private resolveReceptor(
    customer: CheckoutCustomerData,
    delivery: CheckoutDeliveryData,
  ): { name: string; docType: string; docNumber: string } {
    if (delivery.receptorTipo === 'otra_persona' && delivery.receptor) {
      return {
        name: `${delivery.receptor.nombres} ${delivery.receptor.apellidos}`.trim(),
        docType: delivery.receptor.tipoDocumento,
        docNumber: delivery.receptor.numeroDocumento,
      };
    }

    return {
      name: `${customer.nombres} ${customer.apellidos}`.trim(),
      docType: customer.tipoDocumento,
      docNumber: customer.numeroDocumento,
    };
  }

  private applyGuestCheckoutToken(response: GuestCheckoutResponse): void {
    this.checkoutState.saveCheckoutToken(response.checkout_token);
    this.cartService.clearGuestCartStorage();
  }
}

export { DELIVERY_FEE };
