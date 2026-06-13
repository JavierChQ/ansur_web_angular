import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../cart.service';
import {
  CheckoutStateService,
  CompletedOrderSummary,
} from '../services/checkout-state.service';
import {
  STORE_BUSINESS_HOURS,
  STORE_PICKUP_ADDRESS,
} from '../models/checkout.model';

@Component({
  selector: 'app-compra-realizada',
  templateUrl: './compra-realizada.component.html',
  styleUrls: ['./compra-realizada.component.css'],
})
export class CompraRealizadaComponent implements OnInit {
  summary: CompletedOrderSummary | null = null;
  readonly storeAddress = STORE_PICKUP_ADDRESS;
  readonly storeHours = STORE_BUSINESS_HOURS;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly checkoutState: CheckoutStateService,
    private readonly cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.summary = this.checkoutState.getCompletedSummary();
    this.checkoutState.clearAll();
    this.cartService.clearLocalState();
    this.cartService.refreshCart().subscribe();

    const orderIdParam = this.route.snapshot.queryParamMap.get('orderId');
    if (!this.summary && orderIdParam) {
      this.summary = {
        orderId: Number(orderIdParam),
        total: 0,
        subtotal: 0,
        deliveryFee: 0,
        products: [],
      };
    }
  }

  get receptorLabel(): string {
    const delivery = this.summary?.delivery;
    const customer = this.summary?.customer;
    if (!delivery) {
      return '';
    }
    if (delivery.receptorTipo === 'otra_persona' && delivery.receptor) {
      return `${delivery.receptor.nombres} ${delivery.receptor.apellidos}`;
    }
    if (customer) {
      return `${customer.nombres} ${customer.apellidos}`;
    }
    return '';
  }
}
