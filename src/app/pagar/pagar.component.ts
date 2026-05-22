

import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

declare const MercadoPago: any;

@Component({
  selector: 'app-pagar',
  templateUrl: './pagar.component.html',
  styleUrls: ['./pagar.component.css'],
})
export class PagarComponent implements OnInit {
  private mp: any;
  products: any[] = [];
  totalAmount: number = 0;
  private cartApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/payments';
  private cardTokenApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/card_token';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // aquí se pone el token real
    this.mp = new MercadoPago('TEST-34422d86-4f9c-4426-8b6d-60ff374b6909', {
      locale: 'es-PE',
    });

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    this.products = cart.map((product: any) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
    }));
    this.totalAmount = this.products.reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  }

  payWithMercadoPago(): void {
    // aquí se pone el token real
    const accessToken = 'TEST-6239032100822731-090817-0c82c6f39ab7dd100c12208f23b3b014-1983574764';

    this.http.post<any>(
      `https://api.mercadopago.com/checkout/preferences?access_token=${accessToken}`,
      {
        items: this.products.map((product) => ({
          title: product.name,
          quantity: product.quantity,
          unit_price: product.price,
        })),
        back_urls: {
          success: 'https://proyecto-del-instituto.netlify.app/compra-realizada?status=approved',
          failure: 'https://proyecto-del-instituto.netlify.app/error-en-la-compra?status=failed',
          pending: 'https://proyecto-del-instituto.netlify.app/?status=pending',
        },
        auto_return: 'approved',
        payer_email: 'pabloyucragutierrez@gmail.com',
      }
    ).subscribe(
      (response) => {
        const preferenceId = response.id;

        this.mp.checkout({
          preference: {
            id: preferenceId,
          },
          autoOpen: true,
        });
      },
      (error) => {
        console.error('Error al realizar el pago:', error);
      }
    );
  }
}
