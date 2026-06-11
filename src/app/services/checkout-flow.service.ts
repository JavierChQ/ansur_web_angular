import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { CheckoutOrder } from '../models/order.model';
import { AddressService } from './address.service';
import { CheckoutService } from './checkout.service';

const STORE_PICKUP_ADDRESS =
  'CAL.GARCI CARBAJAL NRO. 101 INT. A12 CENTRO COMERCIAL LA ESQUINA DEL FUTURO';
const STORE_PICKUP_DISTRICT = 'Arequipa';

@Injectable({
  providedIn: 'root',
})
export class CheckoutFlowService {
  constructor(
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
    private readonly checkoutService: CheckoutService,
  ) {}

  startDeliveryCheckout(form: {
    direccion: string;
    referencia: string;
    nombreReceptor: string;
    telefono: string;
  }): Observable<CheckoutOrder> {
    const address = [
      form.direccion,
      `Ref: ${form.referencia}`,
      `Receptor: ${form.nombreReceptor}`,
      `Tel: ${form.telefono}`,
    ].join(' | ');

    return this.createAddressAndCheckout(address, form.direccion);
  }

  startPickupCheckout(): Observable<CheckoutOrder> {
    return this.createAddressAndCheckout(
      `Retiro en tienda | ${STORE_PICKUP_ADDRESS}`,
      STORE_PICKUP_DISTRICT,
    );
  }

  private createAddressAndCheckout(
    address: string,
    district: string,
  ): Observable<CheckoutOrder> {
    const userId = this.authService.getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    return this.addressService
      .create({
        address,
        district,
        id_user: userId,
      })
      .pipe(switchMap((created) => this.checkoutService.startCheckout(created.id)));
  }
}
