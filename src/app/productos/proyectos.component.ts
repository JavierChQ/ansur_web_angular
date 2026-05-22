// import { Component, OnInit } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { ActivatedRoute } from '@angular/router';
// import { AuthService } from '../auth.service';

// @Component({
//   selector: 'app-proyectos',
//   templateUrl: './proyectos.component.html',
//   styleUrls: ['./proyectos.component.css'],
// })
// export class ProyectosComponent implements OnInit {
//   products: any[] = [];
//   categorias: any[] = [];
//   private apiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products';
//   private apiCategorias = 'https://ansurbackendnestjs-production.up.railway.app/categories';
//   private searchApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products/search/';
//   private cartApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/payments';
//   private cardTokenApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/mercadopago/card_token';

//   iconosPorCategoria: { [key: string]: string } = {
//     Hogar: 'bx bx-home',
//     Computación: 'bx bx-laptop',
//     Accesorios: 'bx bx-headphone',
//     Limpieza: 'bx bxs-washer',
//     Otros: 'bx bx-plus-circle',
//   };

//   constructor(
//     private http: HttpClient,
//     private route: ActivatedRoute,
//     private authService: AuthService
//   ) {}

//   ngOnInit() {
//     this.route.queryParams.subscribe((params) => {
//       const searchTerm = params['search'];
//       if (searchTerm) {
//         this.searchProducts(searchTerm);
//       } else {
//         this.loadAllProducts();
//       }
//     });

//     this.loadCategories();
//   }

//   loadAllProducts() {
//     this.http.get<any[]>(this.apiUrl).subscribe({
//       next: (data) => {
//         this.products = data;
//         this.products.forEach((product) => (product.quantity = 1));
//         // console.log(data);
//       },
//       error: (err) => {
//         console.error('Error al obtener los productos:', err);
//         alert('Error en la API');
//       },
//     });
//   }

//   searchProducts(searchTerm: string) {
//     const searchUrl = `${this.searchApiUrl}${searchTerm}`;
//     this.http.get<any[]>(searchUrl).subscribe({
//       next: (data) => {
//         this.products = data;
//         this.products.forEach((product) => (product.quantity = 1));
//         // console.log('Productos encontrados:', data);
//       },
//       error: (err) => {
//         // console.error('Error al buscar productos:', err);
//         alert('Error al realizar la búsqueda');
//       },
//     });
//   }

//   loadCategories() {
//     this.http.get<any[]>(this.apiCategorias).subscribe({
//       next: (data) => {
//         this.categorias = data;
//         // console.log(data);
//       },
//       error: (err) => {
//         // console.error('Error al obtener las categorías:', err);
//         alert('Error en la API');
//       },
//     });
//   }

//   getIdCategory(id: number) {
//     const apiPC = `https://ansurbackendnestjs-production.up.railway.app/products/category/${id}`;
//     this.http.get<any[]>(apiPC).subscribe({
//       next: (data) => {
//         this.products = data;
//         this.products.forEach((product) => (product.quantity = 1));
//         // console.log('Productos filtrados por categoría', data);
//       },
//       error: (err) => {
//         // console.error('Error al obtener los productos por categoría:', err);
//         alert('Error al filtrar por categoría');
//       },
//     });
//   }

//   obtenerIcono(categoriaNombre: string): string {
//     return this.iconosPorCategoria[categoriaNombre] || 'bx bx-question-mark';
//   }

//   aumentar(product: any) {
//     product.quantity++;
//   }

//   disminuir(product: any) {
//     if (product.quantity > 1) {
//       product.quantity--;
//     }
//   }

//   async generateCardToken() {
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
//       console.error('Error al generar el token de tarjeta:', error);
//       throw error;
//     }
//   }

//   async addToCart(product: any) {
//     if (!this.authService.isLoggedIn()) {
//       this.showModal('Debe iniciar sesión para agregar productos al carrito.');
//       return;
//     }

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
//           // console.error('Error al agregar producto al carrito:', err);
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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-proyectos',
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.css'],
})
export class ProyectosComponent implements OnInit {
  products: any[] = [];
  categorias: any[] = [];
  private apiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products';
  private apiCategorias = 'https://ansurbackendnestjs-production.up.railway.app/categories';
  private searchApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products/search/';

  iconosPorCategoria: { [key: string]: string } = {
    Hogar: 'bx bx-home',
    Computación: 'bx bx-laptop',
    Accesorios: 'bx bx-headphone',
    Limpieza: 'bx bxs-washer',
    Otros: 'bx bx-plus-circle',
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const searchTerm = params['search'];
      if (searchTerm) {
        this.searchProducts(searchTerm);
      } else {
        this.loadAllProducts();
      }
    });

    this.loadCategories();
  }

  loadAllProducts() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.products = data;
        console.log("proooo", this.products);
        this.products.forEach((product) => (product.quantity = 1));
      },
      error: (err) => {
        console.error('Error al obtener los productos:', err);
        alert('Error en la API');
      },
    });
  }

  searchProducts(searchTerm: string) {
    const searchUrl = `${this.searchApiUrl}${searchTerm}`;
    this.http.get<any[]>(searchUrl).subscribe({
      next: (data) => {
        this.products = data;
        this.products.forEach((product) => (product.quantity = 1));
      },
      error: (err) => {
        alert('Error al realizar la búsqueda');
      },
    });
  }

  loadCategories() {
    this.http.get<any[]>(this.apiCategorias).subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (err) => {
        alert('Error en la API');
      },
    });
  }

  getIdCategory(id: number) {
    const apiPC = `https://ansurbackendnestjs-production.up.railway.app/products/category/${id}`;
    this.http.get<any[]>(apiPC).subscribe({
      next: (data) => {
        this.products = data;
        this.products.forEach((product) => (product.quantity = 1));
      },
      error: (err) => {
        alert('Error al filtrar por categoría');
      },
    });
  }

  obtenerIcono(categoriaNombre: string): string {
    return this.iconosPorCategoria[categoriaNombre] || 'bx bx-question-mark';
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
