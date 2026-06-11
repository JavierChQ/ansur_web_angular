export interface Product {
  id: number;
  name: string;
  description?: string;
  image1?: string;
  image2?: string;
  id_category?: number;
  sales_price: number;
  sale_price?: number;
  in_stock?: boolean;
  available?: number;
  quantity?: number;
}
