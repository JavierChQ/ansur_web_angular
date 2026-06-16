export interface OrderProductLine {
  id_product: number;
  quantity: number;
  unit_price?: number;
  product?: {
    id: number;
    name: string;
    sale_price?: number;
    sales_price?: number;
    image1?: string;
  };
}

export type OrderStatus =
  | 'PENDIENTE_PAGO'
  | 'PAGADO'
  | 'CANCELADO'
  | 'EXPIRADO'
  | 'DESPACHADO'
  | 'REEMBOLSADO';

export interface Order {
  id: number;
  reference_code?: string;
  id_client: number;
  id_address: number;
  amount: number;
  status: OrderStatus | string;
  expires_at?: string;
  payment_id?: string;
  created_at: string;
  delivery_type?: string;
  delivery_fee?: number;
  customer_name?: string;
  customer_lastname?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_doc_type?: string;
  customer_doc_number?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  referencia?: string;
  receptor_type?: string;
  receptor_nombres?: string;
  receptor_apellidos?: string;
  receptor_doc_type?: string;
  receptor_doc_number?: string;
  orderHasProducts?: OrderProductLine[];
  user?: {
    id: number;
    name: string;
    lastname: string;
    email: string;
    phone?: string;
  };
  address?: {
    id: number;
    address: string;
    district: string;
  };
}

export interface CheckoutOrder {
  id: number;
  reference_code?: string;
  id_client: number;
  id_address: number;
  amount: number;
  status: string;
  expires_at: string;
  delivery_type?: string;
  delivery_fee?: number;
  orderHasProducts: OrderProductLine[];
}

export interface PaymentResponse {
  id: number;
  status: string;
  status_detail?: string;
}
