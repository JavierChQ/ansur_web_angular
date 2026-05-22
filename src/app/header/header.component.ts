import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service'; // Asegúrate de tener el servicio AuthService

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  name: string | null = '';
  searchTerm: string = '';
  private searchApiUrl = 'https://ansurbackendnestjs-production.up.railway.app/products/search/';

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService // Inyectar AuthService
  ) {}

  ngOnInit(): void {
    this.name = localStorage.getItem('nombre');
  }

  deleteToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('cart');
    localStorage.removeItem('purchasedProducts');
    localStorage.removeItem('totalAmount');
    window.location.reload();
  }

  searchProduct() {
    if (!this.searchTerm.trim()) {
      this.showModal('Ingrese algún producto para buscar');
      return;
    }

    const searchUrl = `${this.searchApiUrl}${this.searchTerm}`;
    this.http.get<any[]>(searchUrl).subscribe({
      next: (data) => {
        if (data.length > 0) {
          this.router.navigate(['/productos'], {
            queryParams: { search: this.searchTerm },
          });
        } else {
          this.showModal('No se encontraron productos.');
        }
      },
      error: (err) => {
        console.error('Error al buscar productos:', err);
        this.showModal('Ocurrió un error al realizar la búsqueda. Por favor, intenta nuevamente.');
      },
    });
  }

  // Método cart
  handleCartClick() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/cart']);
    } else {
      this.showCartModal('Debes iniciar sesión para acceder al carrito');
    }
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

  showCartModal(message: string): void {
    const modalContent = document.getElementById('cart-modal-content');
    if (modalContent) {
      modalContent.innerText = message;
    }
    const modal = document.getElementById('cartModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  closeCartModal(): void {
    const modal = document.getElementById('cartModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}
