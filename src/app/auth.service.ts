import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  // Método para verificar si el usuario está autenticado
  isLoggedIn(): boolean {
    // Aquí se verifica si existe un token en el localStorage
    return !!localStorage.getItem('token');
  }

  // Método para iniciar sesión, guardar el token y otros detalles
  login(token: string): void {
    localStorage.setItem('token', token);
  }

  // Método para cerrar sesión, eliminando el token
  logout(): void {
    localStorage.removeItem('token');
  }

  // Método para obtener el token de autenticación
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
