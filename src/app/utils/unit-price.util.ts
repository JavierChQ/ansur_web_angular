export function unitPrice(item: {
  sales_price?: number;
  sale_price?: number;
  price?: number;
}): number {
  return Number(item.sales_price ?? item.sale_price ?? item.price ?? 0);
}
