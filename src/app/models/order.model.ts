export interface OrderProductLine {
  id_product: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    sale_price?: number;
    image1?: string;
  };
}

export interface CheckoutOrder {
  id: number;
  id_client: number;
  id_address: number;
  amount: number;
  status: string;
  expires_at: string;
  orderHasProducts: OrderProductLine[];
}

export interface PaymentResponse {
  id: number;
  status: string;
  status_detail?: string;
}
