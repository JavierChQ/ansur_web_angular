export interface CartItem {
  id_product: number;
  name: string;
  sales_price: number;
  quantity: number;
  in_stock: boolean;
  available: number;
}

export interface Cart {
  id: number;
  status: string;
  expires_at: string;
  items: CartItem[];
  total: number;
}

export interface CartDisplayItem extends CartItem {
  image?: string;
}
