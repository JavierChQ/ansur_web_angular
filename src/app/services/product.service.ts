import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { normalizeProduct } from '../utils/product.util';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly productsUrl = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  getById(id: number): Observable<Product> {
    return this.http
      .get<Product>(`${this.productsUrl}/${id}`)
      .pipe();
  }

  getFreshProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${id}`).pipe();
  }

  normalize(product: Product): Product {
    return normalizeProduct(product);
  }
}
