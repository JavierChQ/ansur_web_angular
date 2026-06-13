import { Injectable } from '@angular/core';
import {
  CheckoutCustomerData,
  CheckoutDeliveryData,
  getDeliveryFee,
} from '../models/checkout.model';
import { CheckoutOrder, OrderProductLine } from '../models/order.model';

const ORDER_KEY = 'pendingOrder';
const CUSTOMER_KEY = 'checkoutCustomer';
const DELIVERY_KEY = 'checkoutDelivery';
const COMPLETED_KEY = 'completedOrderSummary';

export interface CompletedOrderSummary {
  orderId: number;
  total: number;
  subtotal: number;
  deliveryFee: number;
  products: {
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
  customer?: CheckoutCustomerData;
  delivery?: CheckoutDeliveryData;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutStateService {
  saveOrder(order: CheckoutOrder): void {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  getOrder(): CheckoutOrder | null {
    const raw = sessionStorage.getItem(ORDER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CheckoutOrder;
    } catch {
      return null;
    }
  }

  saveCustomer(customer: CheckoutCustomerData): void {
    sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  }

  getCustomer(): CheckoutCustomerData | null {
    const raw = sessionStorage.getItem(CUSTOMER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CheckoutCustomerData;
    } catch {
      return null;
    }
  }

  saveDelivery(delivery: CheckoutDeliveryData): void {
    sessionStorage.setItem(DELIVERY_KEY, JSON.stringify(delivery));
  }

  getDelivery(): CheckoutDeliveryData | null {
    const raw = sessionStorage.getItem(DELIVERY_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CheckoutDeliveryData;
    } catch {
      return null;
    }
  }

  saveCompletedSummary(summary: CompletedOrderSummary): void {
    sessionStorage.setItem(COMPLETED_KEY, JSON.stringify(summary));
  }

  getCompletedSummary(): CompletedOrderSummary | null {
    const raw = sessionStorage.getItem(COMPLETED_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CompletedOrderSummary;
    } catch {
      return null;
    }
  }

  clearCompletedSummary(): void {
    sessionStorage.removeItem(COMPLETED_KEY);
  }

  clear(): void {
    sessionStorage.removeItem(ORDER_KEY);
    sessionStorage.removeItem(CUSTOMER_KEY);
    sessionStorage.removeItem(DELIVERY_KEY);
  }

  clearAll(): void {
    this.clear();
    this.clearCompletedSummary();
  }

  isExpired(order: CheckoutOrder | null): boolean {
    if (!order?.expires_at) {
      return false;
    }
    return new Date(order.expires_at).getTime() < Date.now();
  }

  buildCompletedSummary(
    order: CheckoutOrder,
    customer: CheckoutCustomerData | null,
    delivery: CheckoutDeliveryData | null,
  ): CompletedOrderSummary {
    const products = (order.orderHasProducts ?? []).map((line: OrderProductLine) => ({
      name: line.product?.name ?? `Producto #${line.id_product}`,
      quantity: line.quantity,
      price: Number(line.product?.sale_price ?? 0),
      image: line.product?.image1,
    }));
    const subtotal = products.reduce(
      (sum: number, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryFee = delivery ? getDeliveryFee(delivery.tipo) : 0;

    return {
      orderId: order.id,
      total: Number(order.amount),
      subtotal,
      deliveryFee,
      products,
      customer: customer ?? undefined,
      delivery: delivery ?? undefined,
    };
  }

  /** @deprecated Use saveOrder */
  save(order: CheckoutOrder): void {
    this.saveOrder(order);
  }

  /** @deprecated Use getOrder */
  get(): CheckoutOrder | null {
    return this.getOrder();
  }
}
