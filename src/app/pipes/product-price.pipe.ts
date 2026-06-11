import { Pipe, PipeTransform } from '@angular/core';
import { unitPrice } from '../utils/unit-price.util';

@Pipe({
  name: 'productPrice',
})
export class ProductPricePipe implements PipeTransform {
  transform(product: { sales_price?: number; sale_price?: number; price?: number } | null | undefined): string {
    if (!product) {
      return '0.00';
    }
    return unitPrice(product).toFixed(2);
  }
}
