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

  // Guardar datos básicos del usuario
  setUser(user: any): void {
    if (!user) return;
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {
      // no-op
    }
  }

  // Obtener datos del usuario
  getUser(): any {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // Método para cerrar sesión, eliminando el token
  logout(): void {
    localStorage.removeItem('token');
  }

  // Método para obtener el token de autenticación
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): number | null {
    const storedId = localStorage.getItem('id');
    if (storedId) {
      const parsed = Number(storedId);
      return Number.isInteger(parsed) ? parsed : null;
    }

    const user = this.getUser();
    if (user?.id) {
      const parsed = Number(user.id);
      return Number.isInteger(parsed) ? parsed : null;
    }

    return null;
  }

  getUserEmail(): string {
    return this.getUser()?.email ?? '';
  }
}
