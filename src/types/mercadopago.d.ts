export interface MercadoPagoCardFormData {
  token: string;
  paymentMethodId: string;
  issuerId: string;
  installments: string;
  cardholderEmail: string;
  identificationType: string;
  identificationNumber: string;
  amount: string;
}

export interface MercadoPagoCardForm {
  getCardFormData: () => MercadoPagoCardFormData;
  mount: () => void;
  unmount: () => void;
}

export interface MercadoPagoYapeInstance {
  create: () => Promise<{ id: string }>;
}

export interface MercadoPagoInstance {
  cardForm: (options: Record<string, unknown>) => MercadoPagoCardForm;
  yape: (options: { otp: string; phoneNumber: string }) => MercadoPagoYapeInstance;
}

declare global {
  interface Window {
    MercadoPago: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}
