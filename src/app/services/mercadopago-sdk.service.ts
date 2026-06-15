import { Injectable, NgZone } from '@angular/core';
import {
  MercadoPagoCardForm,
  MercadoPagoCardFormData,
  MercadoPagoInstance,
} from '../../types/mercadopago';

export interface MountCardFormOptions {
  amount: string;
  payerEmail?: string;
  payerName?: string;
  identificationType?: string;
  identificationNumber?: string;
  onSubmit: (data: MercadoPagoCardFormData) => void | Promise<void>;
  onError?: (error: unknown) => void;
  onInstallmentsError?: (error: unknown) => void;
}

const CARD_FORM_FIELD_IDS = [
  'form-checkout__cardNumber',
  'form-checkout__expirationDate',
  'form-checkout__securityCode',
  'form-checkout__cardholderName',
  'form-checkout__issuer',
  'form-checkout__installments',
  'form-checkout__identificationType',
  'form-checkout__identificationNumber',
  'form-checkout__cardholderEmail',
] as const;

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoSdkService {
  private mp: MercadoPagoInstance | null = null;
  private cardForm: MercadoPagoCardForm | null = null;
  private publicKey: string | null = null;
  private unmountPromise: Promise<void> | null = null;

  constructor(private readonly ngZone: NgZone) {}

  async init(publicKey: string, locale = 'es-PE'): Promise<void> {
    if (!window.MercadoPago) {
      throw new Error('El SDK de Mercado Pago no está disponible.');
    }

    await this.unmountCardForm();

    if (this.mp && this.publicKey === publicKey) {
      return;
    }

    this.mp = new window.MercadoPago(publicKey, { locale });
    this.publicKey = publicKey;
  }

  async unmountCardForm(): Promise<void> {
    if (this.unmountPromise) {
      await this.unmountPromise;
      return;
    }

    this.unmountPromise = this.performUnmount();
    try {
      await this.unmountPromise;
    } finally {
      this.unmountPromise = null;
    }
  }

  reset(): void {
    void this.unmountCardForm();
  }

  async mountCardForm(options: MountCardFormOptions): Promise<void> {
    if (!this.mp) {
      throw new Error('Mercado Pago no está inicializado.');
    }

    await this.unmountCardForm();

    return new Promise<void>((resolve, reject) => {
      try {
        this.cardForm = this.mp!.cardForm({
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
                this.cardForm = null;
                this.ngZone.run(() => {
                  options.onError?.(error);
                  reject(error);
                });
                return;
              }

              setTimeout(() => {
                this.applyPayerFields(options);
                this.ngZone.run(() => resolve());
              }, 150);
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
      } catch (error) {
        this.cardForm = null;
        reject(error);
      }
    });
  }

  async createYapeToken(otp: string, phoneNumber: string): Promise<string> {
    if (!this.mp) {
      throw new Error('Mercado Pago no está inicializado.');
    }

    const yape = this.mp.yape({ otp, phoneNumber });
    const token = await yape.create();
    return token.id;
  }

  private async performUnmount(): Promise<void> {
    const instance = this.cardForm;
    this.cardForm = null;

    if (instance) {
      try {
        instance.unmount();
      } catch {
        // El SDK puede lanzar si ya estaba desmontado.
      }
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.clearFieldContainers();
        resolve();
      }, 50);
    });
  }

  private clearFieldContainers(): void {
    CARD_FORM_FIELD_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      if (element.tagName === 'SELECT') {
        element.innerHTML = '';
        return;
      }

      if (element.tagName === 'INPUT') {
        (element as HTMLInputElement).value = '';
        element.removeAttribute('readonly');
        element.removeAttribute('disabled');
        return;
      }

      element.innerHTML = '';
    });
  }

  private applyPayerFields(options: MountCardFormOptions): void {
    if (options.payerEmail) {
      const emailInput = document.getElementById(
        'form-checkout__cardholderEmail',
      ) as HTMLInputElement | null;
      if (emailInput) {
        emailInput.value = options.payerEmail;
      }
    }

    if (options.payerName) {
      const nameInput = document.getElementById(
        'form-checkout__cardholderName',
      ) as HTMLInputElement | null;
      if (nameInput) {
        nameInput.value = options.payerName;
      }
    }

    if (options.identificationType) {
      const typeSelect = document.getElementById(
        'form-checkout__identificationType',
      ) as HTMLSelectElement | null;
      if (typeSelect) {
        typeSelect.value = options.identificationType;
        typeSelect.dispatchEvent(new Event('change'));
      }
    }

    if (options.identificationNumber) {
      const numberInput = document.getElementById(
        'form-checkout__identificationNumber',
      ) as HTMLInputElement | null;
      if (numberInput) {
        numberInput.value = options.identificationNumber;
      }
    }
  }
}
