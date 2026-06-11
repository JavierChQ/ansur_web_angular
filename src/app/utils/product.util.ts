import { Product } from '../models/product.model';
import { unitPrice } from './unit-price.util';

export function normalizeProduct(
  raw: Partial<Product> & { sale_price?: number; price?: number },
): Product {
  return {
    ...raw,
    id: Number(raw.id),
    name: raw.name ?? '',
    sales_price: unitPrice(raw),
    in_stock: raw.in_stock,
    available: raw.available !== undefined && raw.available !== null
      ? Number(raw.available)
      : undefined,
    quantity: raw.quantity ?? 1,
  } as Product;
}
