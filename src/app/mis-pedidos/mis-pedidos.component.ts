import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Order, OrderStatus } from '../models/order.model';
import {
  STORE_BUSINESS_HOURS,
  STORE_PICKUP_ADDRESS,
} from '../models/checkout.model';
import { OrdersService } from '../services/orders.service';

@Component({
  selector: 'app-mis-pedidos',
  templateUrl: './mis-pedidos.component.html',
  styleUrls: ['./mis-pedidos.component.css'],
})
export class MisPedidosComponent implements OnInit {
  orders: Order[] = [];
  isLoading = true;
  error = '';

  readonly storeAddress = STORE_PICKUP_ADDRESS;
  readonly storeHours = STORE_BUSINESS_HOURS;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/mis-pedidos' },
      });
      return;
    }

    this.ordersService.getMyOrders().subscribe({
      next: (data) => {
        this.orders = (data ?? []).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus pedidos.';
        this.isLoading = false;
      },
    });
  }

  getCustomerName(order: Order): string {
    if (order.customer_name || order.customer_lastname) {
      return `${order.customer_name ?? ''} ${order.customer_lastname ?? ''}`.trim();
    }
    if (order.user) {
      return `${order.user.name} ${order.user.lastname}`.trim();
    }
    return '—';
  }

  getReceptorName(order: Order): string {
    return `${order.receptor_nombres ?? ''} ${order.receptor_apellidos ?? ''}`.trim() || '—';
  }

  getDeliveryLabel(order: Order): string {
    if (order.delivery_type === 'pickup') {
      return 'Retiro en tienda';
    }
    if (order.delivery_type === 'delivery') {
      return 'Envío a domicilio';
    }
    return '—';
  }

  getStatusLabel(status: OrderStatus | string): string {
    const labels: Record<string, string> = {
      PENDIENTE_PAGO: 'Pendiente de pago',
      PAGADO: 'Pagado',
      CANCELADO: 'Cancelado',
      EXPIRADO: 'Expirado',
      DESPACHADO: 'Despachado',
      REEMBOLSADO: 'Reembolsado',
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: OrderStatus | string): string {
    switch (status) {
      case 'PAGADO':
        return 'status-paid';
      case 'DESPACHADO':
        return 'status-shipped';
      case 'PENDIENTE_PAGO':
        return 'status-pending';
      case 'CANCELADO':
      case 'EXPIRADO':
      case 'REEMBOLSADO':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getLinePrice(line: NonNullable<Order['orderHasProducts']>[number]): number {
    return Number(line.unit_price ?? line.product?.sale_price ?? line.product?.sales_price ?? 0);
  }
}
