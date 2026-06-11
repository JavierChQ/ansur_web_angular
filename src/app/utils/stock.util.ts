export function getAvailableQuantity(
  item: { available?: number } | null | undefined,
): number {
  const available = item?.available;
  if (available === undefined || available === null) {
    return item ? Number.MAX_SAFE_INTEGER : 0;
  }
  return Math.max(0, available);
}

export function isInStock(
  product: { in_stock?: boolean; available?: number } | null | undefined,
): boolean {
  if (product?.in_stock === false) {
    return false;
  }
  return getAvailableQuantity(product) > 0;
}

export function getStockLabel(
  product: { in_stock?: boolean; available?: number } | null | undefined,
): string {
  return isInStock(product) ? 'Disponible' : 'Agotado';
}

export function getMaxAddableQuantity(
  product: { available?: number; in_stock?: boolean },
  existingCartQuantity = 0,
): number {
  if (!isInStock(product)) {
    return 0;
  }
  return Math.max(0, getAvailableQuantity(product) - existingCartQuantity);
}

export function canIncreaseAddQuantity(
  product: { in_stock?: boolean; available?: number } | null | undefined,
  currentQuantity: number,
  existingCartQuantity = 0,
): boolean {
  const max = getMaxAddableQuantity(product ?? {}, existingCartQuantity);
  return currentQuantity < max;
}

export function canIncreaseCartQuantity(
  item: { in_stock?: boolean; available?: number; quantity: number } | null | undefined,
): boolean {
  if (!item || !isInStock(item)) {
    return false;
  }
  return item.quantity < getAvailableQuantity(item);
}

export function getStockLimitMessage(
  product: { available?: number; in_stock?: boolean },
  existingCartQuantity = 0,
): string {
  const max = getMaxAddableQuantity(product, existingCartQuantity);
  if (max <= 0) {
    return 'Este producto no tiene stock disponible.';
  }
  return `Solo puedes agregar hasta ${max} unidad${max === 1 ? '' : 'es'} (stock disponible).`;
}

export function getCartStockLimitMessage(
  item: { available?: number; quantity: number },
): string {
  const max = getAvailableQuantity(item);
  if (max <= 0) {
    return 'Este producto no tiene stock disponible.';
  }
  return `Solo hay ${max} unidad${max === 1 ? '' : 'es'} disponible${max === 1 ? '' : 's'} en stock.`;
}
