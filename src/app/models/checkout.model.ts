export const DELIVERY_FEE = 15;

export const STORE_PICKUP_ADDRESS =
  'CAL.GARCI CARBAJAL NRO. 101 INT. A12 CENTRO COMERCIAL LA ESQUINA DEL FUTURO';

export const STORE_BUSINESS_HOURS = 'Lunes a Sábado de 8:00 AM a 8:00 PM';

export type DocType = 'DNI' | 'PASAPORTE' | 'CE';

export type DeliveryType = 'delivery' | 'pickup';

export type ReceptorType = 'yo' | 'otra_persona';

export interface CheckoutCustomerData {
  email: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: DocType;
  numeroDocumento: string;
  celular: string;
}

export interface CheckoutReceptorData {
  nombres: string;
  apellidos: string;
  tipoDocumento: DocType;
  numeroDocumento: string;
}

export interface CheckoutDeliveryData {
  tipo: DeliveryType;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  referencia?: string;
  receptorTipo: ReceptorType;
  receptor?: CheckoutReceptorData;
}

export interface GuestCheckoutItemPayload {
  id_product: number;
  quantity: number;
}

export interface GuestCheckoutPayload {
  items: GuestCheckoutItemPayload[];
  customer: {
    email: string;
    name: string;
    lastname: string;
    phone: string;
    doc_type: DocType;
    doc_number: string;
  };
  delivery: {
    type: DeliveryType;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    direccion?: string;
    referencia?: string;
    receptor_type: ReceptorType;
    receptor?: {
      nombres: string;
      apellidos: string;
      doc_type: DocType;
      doc_number: string;
    };
  };
}

export interface AuthenticatedCheckoutPayload {
  id_address: number;
  customer: GuestCheckoutPayload['customer'];
  delivery: GuestCheckoutPayload['delivery'];
}

export interface GuestCheckoutResponse {
  order: import('./order.model').CheckoutOrder;
  checkout_token: string;
}

export interface ClaimGuestSessionResponse {
  token: string;
  user: {
    id: number;
    name: string;
    lastname: string;
    email: string;
    phone: string;
  };
  password_not_set: boolean;
}

export function getDeliveryFee(tipo?: DeliveryType): number {
  return tipo === 'delivery' ? DELIVERY_FEE : 0;
}

export function mapDocTypeToMercadoPago(tipo: DocType): string {
  switch (tipo) {
    case 'DNI':
      return 'DNI';
    case 'PASAPORTE':
      return 'PAS';
    case 'CE':
      return 'CE';
    default:
      return 'DNI';
  }
}
