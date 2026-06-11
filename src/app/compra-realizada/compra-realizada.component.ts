import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../cart.service';
import { CheckoutStateService } from '../services/checkout-state.service';

@Component({
  selector: 'app-compra-realizada',
  templateUrl: './compra-realizada.component.html',
  styleUrls: ['./compra-realizada.component.css'],
})
export class CompraRealizadaComponent implements OnInit {
  orderId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly checkoutState: CheckoutStateService,
    private readonly cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.checkoutState.clear();
    this.cartService.clearLocalState();
    this.cartService.refreshCart().subscribe();

    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    this.orderId = orderId ? Number(orderId) : null;
  }
}
