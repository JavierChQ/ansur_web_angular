// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Component, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router'; // Importa el Router

// @Component({
//   selector: 'app-datos-del-usuario',
//   templateUrl: './datos-del-usuario.component.html',
//   styleUrls: ['./datos-del-usuario.component.css']
// })
// export class DatosDelUsuarioComponent implements OnInit{
//   userForm: FormGroup;
//   showErrorModal: boolean = false;
//   products: any[] = [];
//   totalAmount: number = 0;

//   constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) { // Inyecta el Router
//     const nombre = localStorage.getItem('nombre') || '';
//     const apellidos = localStorage.getItem('apellidos') || '';

//     this.userForm = this.fb.group({
//       nombres: [nombre, Validators.required],
//       apellidos: [apellidos, Validators.required],
//     });
//   }

//   ngOnInit(): void {
//     const orderId = localStorage.getItem('id');
//     const token = localStorage.getItem('token');

//     if (orderId && token) {
//       const headers = new HttpHeaders().set('Authorization', `${token}`);
      
//       this.http.get<any[]>(`https://ansurbackendnestjs-production.up.railway.app/orders/${orderId}`, { headers }).subscribe(response => {
//         this.products = response.flatMap(order => 
//           order.orderHasProducts.map((orderProduct: any) => ({
//             title: orderProduct.product.name,
//             unit_price: orderProduct.product.price,
//             quantity: orderProduct.quantity,
//             image1: orderProduct.product.image1
//           }))
//         );

//         this.totalAmount = this.products.reduce((total, product) => total + (product.unit_price * product.quantity), 0);
//       }, error => {
//         console.error('Error al obtener los productos:', error);
//       });
//     }
//   }


//   onSubmit() {
//     if (this.userForm.valid) {
//       this.router.navigate(['/tipo-de-entrega']);
//     } else {
//       this.showErrorModal = true;
//       this.userForm.markAllAsTouched();
//     }
//   }

//   closeModal() {
//     this.showErrorModal = false;
//   }
// }


import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-datos-del-usuario',
  templateUrl: './datos-del-usuario.component.html',
  styleUrls: ['./datos-del-usuario.component.css']
})
export class DatosDelUsuarioComponent implements OnInit {
  userForm: FormGroup;
  showErrorModal: boolean = false;
  products: any[] = [];
  totalAmount: number = 0;

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
    const nombre = localStorage.getItem('nombre') || '';
    const apellidos = localStorage.getItem('apellidos') || '';

    this.userForm = this.fb.group({
      nombres: [nombre, Validators.required],
      apellidos: [apellidos, Validators.required],
    });
  }

  ngOnInit(): void {
    // Leer productos desde localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Procesar los productos del carrito
    this.products = cart.map((product: any) => ({
      title: product.name,
      unit_price: product.price,
      quantity: product.quantity,
      image1: product.image
    }));

    // Calcular el total
    this.totalAmount = this.products.reduce((total, product) => total + (product.unit_price * product.quantity), 0);
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.router.navigate(['/tipo-de-entrega']);
    } else {
      this.showErrorModal = true;
      this.userForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}
