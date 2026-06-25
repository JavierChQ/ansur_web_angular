import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CheckoutStateService,
  PendingWhatsappOrderSummary,
} from '../services/checkout-state.service';

@Component({
  selector: 'app-pedido-registrado',
  templateUrl: './pedido-registrado.component.html',
  styleUrls: ['./pedido-registrado.component.css'],
})
export class PedidoRegistradoComponent implements OnInit {
  summary: PendingWhatsappOrderSummary | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly checkoutState: CheckoutStateService,
  ) {}

  ngOnInit(): void {
    this.summary = this.checkoutState.getPendingWhatsappSummary();

    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    const referenceCode = this.route.snapshot.queryParamMap.get('referenceCode');

    if (!this.summary && orderId) {
      this.summary = {
        orderId,
        orderReferenceCode: referenceCode ?? String(orderId),
        total: 0,
        expiresAt: this.route.snapshot.queryParamMap.get('expiresAt') ?? '',
        whatsappUrl: this.route.snapshot.queryParamMap.get('whatsappUrl') ?? '',
      };
    }

    if (!this.summary) {
      this.router.navigate(['/inicio']);
    }
  }

  get expiresAtLabel(): string {
    if (!this.summary?.expiresAt) {
      return '';
    }

    return new Date(this.summary.expiresAt).toLocaleString('es-PE');
  }

  openWhatsapp(): void {
    if (!this.summary?.whatsappUrl) {
      return;
    }

    window.open(this.summary.whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}
