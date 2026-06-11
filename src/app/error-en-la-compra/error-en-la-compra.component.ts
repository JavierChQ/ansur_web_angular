import { Component, OnInit } from '@angular/core';
import { CheckoutStateService } from '../services/checkout-state.service';

@Component({
  selector: 'app-error-en-la-compra',
  templateUrl: './error-en-la-compra.component.html',
  styleUrl: './error-en-la-compra.component.css',
})
export class ErrorEnLaCompraComponent implements OnInit {
  constructor(private readonly checkoutState: CheckoutStateService) {}

  ngOnInit(): void {
    this.checkoutState.clear();
  }
}
