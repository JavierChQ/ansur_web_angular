import { Injectable, NgZone } from '@angular/core';
import { MercadoPagoCardForm, MercadoPagoCardFormData, MercadoPagoInstance } from '../../types/mercadopago';

export interface MountCardFormOptions {
  amount: string;
  payerEmail?: string;
  onSubmit: (data: MercadoPagoCardFormData) => void | Promise<void>;
  onError?: (error: unknown) => void;
  onInstallmentsError?: (error: unknown) => void;
}

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoSdkService {
  private mp: MercadoPagoInstance | null = null;
  private cardForm: MercadoPagoCardForm | null = null;

  constructor(private readonly ngZone: NgZone) {}

  async init(publicKey: string, locale = 'es-PE'): Promise<void> {
    if (!window.MercadoPago) {
      throw new Error('El SDK de Mercado Pago no está disponible.');
    }

    this.mp = new window.MercadoPago(publicKey, { locale });
  }

  mountCardForm(options: MountCardFormOptions): void {
    if (!this.mp) {
      throw new Error('Mercado Pago no está inicializado.');
    }

    if (this.cardForm) {
      return;
    }

    this.cardForm = this.mp.cardForm({
      amount: options.amount,
      iframe: true,
      form: {
        id: 'form-checkout',
        cardNumber: {
          id: 'form-checkout__cardNumber',
          placeholder: 'Número de tarjeta',
        },
        expirationDate: {
          id: 'form-checkout__expirationDate',
          placeholder: 'MM/AA',
        },
        securityCode: {
          id: 'form-checkout__securityCode',
          placeholder: 'CVV',
        },
        cardholderName: {
          id: 'form-checkout__cardholderName',
          placeholder: 'Titular de la tarjeta',
        },
        issuer: {
          id: 'form-checkout__issuer',
          placeholder: 'Banco emisor',
        },
        installments: {
          id: 'form-checkout__installments',
          placeholder: 'Cuotas',
        },
        identificationType: {
          id: 'form-checkout__identificationType',
          placeholder: 'Tipo de documento',
        },
        identificationNumber: {
          id: 'form-checkout__identificationNumber',
          placeholder: 'Número de documento',
        },
        cardholderEmail: {
          id: 'form-checkout__cardholderEmail',
          placeholder: 'Correo electrónico',
        },
      },
      callbacks: {
        onFormMounted: (error: unknown) => {
          if (error) {
            this.ngZone.run(() => options.onError?.(error));
          }
        },
        onSubmit: (event: Event) => {
          event.preventDefault();
          const data = this.cardForm?.getCardFormData();
          if (!data) {
            return;
          }

          this.ngZone.run(() => {
            void options.onSubmit(data);
          });
        },
        onFetching: (resource: string) => {
          const isInstallments = resource === 'installments';
          return (error?: unknown) => {
            if (isInstallments && error) {
              this.ngZone.run(() => options.onInstallmentsError?.(error));
            }
          };
        },
      },
    });

    if (options.payerEmail) {
      const emailInput = document.getElementById(
        'form-checkout__cardholderEmail',
      ) as HTMLInputElement | null;
      if (emailInput) {
        emailInput.value = options.payerEmail;
      }
    }
  }

  async createYapeToken(otp: string, phoneNumber: string): Promise<string> {
    if (!this.mp) {
      throw new Error('Mercado Pago no está inicializado.');
    }

    const yape = this.mp.yape({ otp, phoneNumber });
    const token = await yape.create();
    return token.id;
  }
}
