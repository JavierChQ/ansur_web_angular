// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Component } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-tipo-de-entrega',
//   templateUrl: './tipo-de-entrega.component.html',
//   styleUrls: ['./tipo-de-entrega.component.css']
// })
// export class TipoDeEntregaComponent {
//   activeSection: 'delivery' | 'pickup' = 'delivery';
//   entregaForm: FormGroup;
//   showErrorModal: boolean = false;
//   products: any[] = [];
//   totalAmount: number = 0;

//   constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
//     this.entregaForm = this.fb.group({
//       direccion: ['', Validators.required],
//       referencia: ['', Validators.required],
//       nombreReceptor: ['', Validators.required],
//       telefono: ['', Validators.required]
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

  

//   setActiveSection(section: 'delivery' | 'pickup') {
//     this.activeSection = section;
//   }

//   isActive(section: 'delivery' | 'pickup'): boolean {
//     return this.activeSection === section;
//   }

//   onSubmit() {
//     if (this.entregaForm.valid) {
//       this.router.navigate(['/pagar']);
//     } else {
//       this.showErrorModal = true; 
//       this.entregaForm.markAllAsTouched();
//     }
//   }

//   closeErrorModal() {
//     this.showErrorModal = false; 
//   }

//   redirectToPagar() {
//     this.router.navigate(['/pagar']);
//   }
// }



import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tipo-de-entrega',
  templateUrl: './tipo-de-entrega.component.html',
  styleUrls: ['./tipo-de-entrega.component.css']
})
export class TipoDeEntregaComponent implements OnInit {
  activeSection: 'delivery' | 'pickup' = 'delivery';
  entregaForm: FormGroup;
  showErrorModal: boolean = false;
  products: any[] = [];
  totalAmount: number = 0;

  constructor(private fb: FormBuilder, private router: Router) {
    this.entregaForm = this.fb.group({
      direccion: ['', Validators.required],
      referencia: ['', Validators.required],
      nombreReceptor: ['', Validators.required],
      telefono: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    this.products = cart.map((product: any) => ({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      image: product.image
    }));
    this.totalAmount = this.products.reduce((total, product) => total + (product.price * product.quantity), 0);
  }

  setActiveSection(section: 'delivery' | 'pickup') {
    this.activeSection = section;
  }

  isActive(section: 'delivery' | 'pickup'): boolean {
    return this.activeSection === section;
  }

  onSubmit() {
    if (this.entregaForm.valid) {
      this.router.navigate(['/pagar']);
    } else {
      this.showErrorModal = true; 
      this.entregaForm.markAllAsTouched();
    }
  }

  closeErrorModal() {
    this.showErrorModal = false; 
  }
}
