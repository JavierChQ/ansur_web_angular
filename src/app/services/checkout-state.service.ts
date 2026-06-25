import { Injectable } from '@angular/core';
import {
  CheckoutCustomerData,
  CheckoutDeliveryData,
  CheckoutInvoiceData,
  getDeliveryFee,
} from '../models/checkout.model';
import { CheckoutOrder, OrderProductLine } from '../models/order.model';

const ORDER_KEY = 'pendingOrder';
const CUSTOMER_KEY = 'checkoutCustomer';
const DELIVERY_KEY = 'checkoutDelivery';
const INVOICE_KEY = 'checkoutInvoice';
const COMPLETED_KEY = 'completedOrderSummary';
const PENDING_WHATSAPP_KEY = 'pendingWhatsappOrderSummary';
const CHECKOUT_TOKEN_KEY = 'checkout_token';

export interface PendingWhatsappOrderSummary {
  orderId: number;
  orderReferenceCode: string;
  total: number;
  expiresAt: string;
  whatsappUrl: string;
}

export interface CompletedOrderSummary {
  orderId: number;
  orderReferenceCode: string;
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
  invoice?: CheckoutInvoiceData;
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

  saveInvoice(invoice: CheckoutInvoiceData): void {
    sessionStorage.setItem(INVOICE_KEY, JSON.stringify(invoice));
  }

  getInvoice(): CheckoutInvoiceData | null {
    const raw = sessionStorage.getItem(INVOICE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CheckoutInvoiceData;
    } catch {
      return null;
    }
  }

  clearOrder(): void {
    sessionStorage.removeItem(ORDER_KEY);
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

  savePendingWhatsappSummary(summary: PendingWhatsappOrderSummary): void {
    sessionStorage.setItem(PENDING_WHATSAPP_KEY, JSON.stringify(summary));
  }

  getPendingWhatsappSummary(): PendingWhatsappOrderSummary | null {
    const raw = sessionStorage.getItem(PENDING_WHATSAPP_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PendingWhatsappOrderSummary;
    } catch {
      return null;
    }
  }

  clearPendingWhatsappSummary(): void {
    sessionStorage.removeItem(PENDING_WHATSAPP_KEY);
  }

  clear(): void {
    sessionStorage.removeItem(ORDER_KEY);
    sessionStorage.removeItem(CUSTOMER_KEY);
    sessionStorage.removeItem(DELIVERY_KEY);
    sessionStorage.removeItem(INVOICE_KEY);
    this.clearCheckoutToken();
  }

  saveCheckoutToken(token: string): void {
    const normalized = token.trim().replace(/^Bearer\s+/i, '');
    sessionStorage.setItem(CHECKOUT_TOKEN_KEY, normalized);
  }

  getCheckoutToken(): string | null {
    return sessionStorage.getItem(CHECKOUT_TOKEN_KEY);
  }

  hasCheckoutToken(): boolean {
    return !!this.getCheckoutToken();
  }

  clearCheckoutToken(): void {
    sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  }

  clearAll(): void {
    this.clear();
    this.clearCompletedSummary();
    this.clearPendingWhatsappSummary();
  }

  isExpired(order: CheckoutOrder | null): boolean {
    if (!order?.expires_at) {
      return false;
    }
    return new Date(order.expires_at).getTime() < Date.now();
  }

  hasActiveCheckout(): boolean {
    const order = this.getOrder();
    return !!order && !this.isExpired(order);
  }

  getActiveOrder(): CheckoutOrder | null {
    const order = this.getOrder();
    if (!order || this.isExpired(order)) {
      return null;
    }
    return order;
  }

  buildCompletedSummary(
    order: CheckoutOrder,
    customer: CheckoutCustomerData | null,
    delivery: CheckoutDeliveryData | null,
    invoice: CheckoutInvoiceData | null = null,
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
      orderReferenceCode: order.reference_code ?? String(order.id),
      total: Number(order.amount),
      subtotal,
      deliveryFee,
      products,
      customer: customer ?? undefined,
      delivery: delivery ?? undefined,
      invoice: invoice ?? undefined,
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
