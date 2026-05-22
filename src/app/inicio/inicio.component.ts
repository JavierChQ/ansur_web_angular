// import { Component, OnInit } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { AuthService } from '../auth.service';

// @Component({
//   selector: 'app-inicio',
//   templateUrl: './inicio.component.html',
//   styleUrls: ['./inicio.component.css'],
// })
// export class InicioComponent implements OnInit {
//   products: any[] = [];
//   images: string[] = [
//     'assets/banner1.png',
//     'assets/banner2.png',
//     'assets/banner3.png',
//     'assets/banner4.png',
//     'assets/banner5.png',
//   ];
//   currentIndex: number = 0;
//   private apiUrl =
//     'https://ansurbackendnestjs-production.up.railway.app/products';
//   private cartApiUrl =
//     'https://ansurbackendnestjs-production.up.railway.app/mercadopago/payments';
//   private cardTokenApiUrl =
//     'https://ansurbackendnestjs-production.up.railway.app/mercadopago/card_token';

//   constructor(private http: HttpClient, private authService: AuthService) {}

//   ngOnInit() {
//     this.http.get<any[]>(this.apiUrl).subscribe({
//       next: (data) => {
//         this.products = data;
//         this.products.forEach((product) => (product.quantity = 1));
//       },
//       error: (err) => {
//         console.error('Error al obtener los productos:', err);
//         alert('Error en la API');
//       },
//     });
//   }

//   goToSlide(index: number): void {
//     this.currentIndex = index;
//     this.updateSlides();
//   }

//   prevSlide(): void {
//     this.currentIndex =
//       this.currentIndex > 0 ? this.currentIndex - 1 : this.images.length - 1;
//     this.updateSlides();
//   }

//   nextSlide(): void {
//     this.currentIndex =
//       this.currentIndex < this.images.length - 1 ? this.currentIndex + 1 : 0;
//     this.updateSlides();
//   }

//   private updateSlides(): void {
//     const slides = document.querySelector('.slides') as HTMLElement;
//     slides.style.transform = `translateX(-${this.currentIndex * 100}%)`;
//   }

//   aumentar(product: any) {
//     product.quantity++;
//   }

//   disminuir(product: any) {
//     if (product.quantity > 1) {
//       product.quantity--;
//     }
//   }

//   private async generateCardToken() {
//     const cardDetails = {
//       card_number: '5031755734530604',
//       expiration_year: '2025',
//       expiration_month: 11,
//       security_code: '123',
//       cardholder: {
//         name: 'Javier',
//         identification: {
//           number: '43898724',
//           type: 'DNI',
//         },
//       },
//     };

//     const token = localStorage.getItem('token');
//     const headers = token
//       ? new HttpHeaders({ Authorization: `${token}` })
//       : new HttpHeaders();

//     try {
//       const response = await this.http
//         .post(this.cardTokenApiUrl, cardDetails, { headers })
//         .toPromise();
//       if (response && (response as any).id) {
//         return (response as any).id;
//       } else {
//         throw new Error('Respuesta inválida al generar el token de tarjeta');
//       }
//     } catch (error) {
//       // console.error('Error al generar el token de tarjeta:', error);
//       throw error;
//     }
//   }

//   // async addToCart(product: any) {
//   //   if (!this.authService.isLoggedIn()) {
//   //     this.showModal('Debe iniciar sesión para agregar productos al carrito.');
//   //     return;
//   //   }

//   //   try {
//   //     const cardToken = await this.generateCardToken();
//   //     const idUser = localStorage.getItem('id');

//   //     const payload = {
//   //       transaction_amount: product.price * product.quantity,
//   //       token: cardToken,
//   //       installments: 1,
//   //       issuer_id: '12347',
//   //       payment_method_id: 'master',
//   //       payer: {
//   //         email: 'javier@gmail.com',
//   //         identification: {
//   //           type: 'DNI',
//   //           number: '43898724',
//   //         },
//   //       },
//   //       order: {
//   //         id_client: idUser,
//   //         id_address: 1,
//   //         amount: product.price * product.quantity,
//   //         products: [
//   //           {
//   //             id: product.id,
//   //             quantity: product.quantity,
//   //           },
//   //         ],
//   //       },
//   //     };

//   //     const authToken = localStorage.getItem('token');
//   //     const headers = authToken ? new HttpHeaders({ Authorization: `${authToken}` }) : new HttpHeaders();

//   //     await this.http.post(this.cartApiUrl, payload, { headers }).toPromise();
//   //     this.showModal('Producto agregado al carrito.');
//   //   } catch (error) {
//   //     let errorMessage = 'Error desconocido';
//   //     if (error instanceof Error) {
//   //       errorMessage = error.message;
//   //     }
//   //     // console.error('Error al agregar producto al carrito:', errorMessage);
//   //     this.showModal(`Error al agregar producto al carrito: ${errorMessage}`);
//   //   }
//   // }

//   async addToCart(product: any) {
//     if (!this.authService.isLoggedIn()) {
//       this.showModal('Debe iniciar sesión para agregar productos al carrito.');
//       return;
//     }

//     this.saveProductToLocalStorage(product);

//     try {
//       const cardToken = await this.generateCardToken();
//       const idUser = localStorage.getItem('id');

//       const payload = {
//         transaction_amount: product.price * product.quantity,
//         token: cardToken,
//         installments: 1,
//         issuer_id: '12347',
//         payment_method_id: 'master',
//         payer: {
//           email: 'javier@gmail.com',
//           identification: {
//             type: 'DNI',
//             number: '43898724',
//           },
//         },
//         order: {
//           id_client: idUser,
//           id_address: 1,
//           amount: product.price * product.quantity,
//           products: [
//             {
//               id: product.id,
//               quantity: product.quantity,
//             },
//           ],
//         },
//       };

//       const authToken = localStorage.getItem('token');

//       const headers = authToken
//         ? new HttpHeaders({ Authorization: `${authToken}` })
//         : new HttpHeaders();

//       this.http.post(this.cartApiUrl, payload, { headers }).subscribe({
//         next: (response) => {
//           console.log('Producto agregado al carrito:', response);
//           this.showModal('Producto agregado al carrito.');
//         },
//         error: (err) => {
//           this.showModal(
//             `Error al agregar producto al carrito: ${err.message}`
//           );
//         },
//       });
//     } catch (error) {
//       console.error('Error al generar el token de tarjeta:', error);
//       this.showModal('Error al generar el token de tarjeta.');
//     }
//   }

//   saveProductToLocalStorage(product: any) {
//     let cart = JSON.parse(localStorage.getItem('cart') || '[]');

//     const existingProductIndex = cart.findIndex(
//       (item: any) => item.id === product.id
//     );

//     if (existingProductIndex !== -1) {
//       cart[existingProductIndex].quantity += product.quantity;
//     } else {
//       cart.push({
//         id: product.id,
//         name: product.name,
//         quantity: product.quantity,
//         price: product.price,
//         image: product.image1,
//       });
//     }

//     localStorage.setItem('cart', JSON.stringify(cart));
//   }

//   showModal(message: string): void {
//     const modalContent = document.getElementById('modal-content');
//     if (modalContent) {
//       modalContent.innerText = message;
//     }
//     const modal = document.getElementById('myModal');
//     if (modal) {
//       modal.style.display = 'block';
//     }
//   }

//   closeModal(): void {
//     const modal = document.getElementById('myModal');
//     if (modal) {
//       modal.style.display = 'none';
//     }
//   }
// }


import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
})
export class InicioComponent implements OnInit {
  products: any[] = [];
  images: string[] = [
    'assets/banner1.png',
    'assets/banner2.png',
    'assets/banner3.png',
    'assets/banner4.png',
    'assets/banner5.png',
  ];
  currentIndex: number = 0;
  private apiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.products = data;
        this.products.forEach((product) => (product.quantity = 1));
      },
      error: (err) => {
        console.error('Error al obtener los productos:', err);
        alert('Error en la API');
      },
    });
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
    this.updateSlides();
  }

  prevSlide(): void {
    this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.images.length - 1;
    this.updateSlides();
  }

  nextSlide(): void {
    this.currentIndex = this.currentIndex < this.images.length - 1 ? this.currentIndex + 1 : 0;
    this.updateSlides();
  }

  private updateSlides(): void {
    const slides = document.querySelector('.slides') as HTMLElement;
    slides.style.transform = `translateX(-${this.currentIndex * 100}%)`;
  }

  aumentar(product: any) {
    product.quantity++;
  }

  disminuir(product: any) {
    if (product.quantity > 1) {
      product.quantity--;
    }
  }

  addToCart(product: any) {
    if (!this.authService.isLoggedIn()) {
      this.showModal('Debe iniciar sesión para agregar productos al carrito.');
      return;
    }

    this.saveProductToLocalStorage(product);
    this.showModal('Producto agregado al carrito.');
  }

  saveProductToLocalStorage(product: any) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');

    const existingProductIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingProductIndex !== -1) {
      cart[existingProductIndex].quantity += product.quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        image: product.image1,
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
  }

  showModal(message: string): void {
    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
      modalContent.innerText = message;
    }
    const modal = document.getElementById('myModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  closeModal(): void {
    const modal = document.getElementById('myModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}
