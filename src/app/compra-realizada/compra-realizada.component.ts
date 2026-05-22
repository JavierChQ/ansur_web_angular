import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-compra-realizada',
  templateUrl: './compra-realizada.component.html',
  styleUrls: ['./compra-realizada.component.css'],
})
export class CompraRealizadaComponent implements OnInit {
  private cartApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/payments';
  private cardTokenApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/card_token';
  products: any[] = [];
  totalAmount: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'approved') {
      this.loadCartDetails();
      this.handleSuccessfulPurchase();
    }
  }

  loadCartDetails(): void {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    this.products = cart.map((product: any) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
    }));
    this.totalAmount = this.calculateTotalAmount(this.products);
  }

  calculateTotalAmount(products: any[]): number {
    return products.reduce((total, product) => total + product.price * product.quantity, 0);
  }

  async handleSuccessfulPurchase(): Promise<void> {
    try {
      const cardToken = await this.generateCardToken();
      const idUser = localStorage.getItem('id');

      const payload = {
        transaction_amount: this.totalAmount,
        token: cardToken,
        installments: 1,
        issuer_id: '12347',
        payment_method_id: 'master',
        payer: {
          email: 'javier@gmail.com',
          identification: {
            type: 'DNI',
            number: '43898724',
          },
        },
        order: {
          id_client: idUser,
          id_address: 1, // Puedes modificarlo según tu implementación
          amount: this.totalAmount,
          products: this.products.map((product) => ({
            id: product.id,
            quantity: product.quantity,
          })),
        },
      };

      const authToken = localStorage.getItem('token');
      const headers = authToken
        ? new HttpHeaders({ Authorization: `${authToken}` })
        : new HttpHeaders();

      this.http.post(this.cartApiUrl, payload, { headers }).subscribe({
        next: (response) => {
          console.log('Compra exitosa, datos enviados a la API:', response);
          this.storePurchasedProducts();
          this.clearCart();
        },
        error: (err) => {
          console.error('Error al enviar los datos de la compra a la API:', err);
        },
      });
    } catch (error) {
      console.error('Error al procesar la compra:', error);
    }
  }

  async generateCardToken(): Promise<string> {
    const cardDetails = {
      card_number: '5031755734530604',
      expiration_year: '2025',
      expiration_month: 11,
      security_code: '123',
      cardholder: {
        name: 'Javier',
        identification: {
          number: '43898724',
          type: 'DNI',
        },
      },
    };

    const token = localStorage.getItem('token');
    const headers = token
      ? new HttpHeaders({ Authorization: `${token}` })
      : new HttpHeaders();

    try {
      const response = await this.http.post(this.cardTokenApiUrl, cardDetails, { headers }).toPromise();

      if (response && (response as any).id) {
        return (response as any).id;
      } else {
        throw new Error('Respuesta inválida al generar el token de tarjeta');
      }
    } catch (error) {
      console.error('Error al generar el token de tarjeta:', error);
      throw error;
    }
  }

  storePurchasedProducts(): void {
    if (this.products.length > 0) {
      localStorage.setItem('purchasedProducts', JSON.stringify(this.products));
      localStorage.setItem('totalAmount', JSON.stringify(this.totalAmount));
    }
  }

  clearCart(): void {
    localStorage.removeItem('cart');
    this.products = [];
    this.totalAmount = 0;
  }
}
