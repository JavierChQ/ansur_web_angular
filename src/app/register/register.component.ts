import { Component } from '@angular/core';
import { Router } from '@angular/router'; 
import { AuthService } from '../auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = {
    name: '',
    lastname: '',
    phone: '',
    email: '',
    password: ''
  };
  
  passwordType: string = 'password';

  showEmptyFormError: boolean = false;
  showEmailExistsError: boolean = false;
  showApiError: boolean = false;
  showSuccessMessage: boolean = false;

  errors: any = {
    name: '',
    lastname: '',
    phone: '',
    email: '',
    password: ''
  };

  constructor(private router: Router, private authService: AuthService, private apiService: ApiService) {}

  validateForm() {
    this.clearErrors();
    let isValid = true;

    // Validación de nombre
    if (!this.user.name || !/^[a-zA-Z\s]{2,}$/.test(this.user.name)) {
      this.errors.name = 'Nombre incorrecto. Debe contener al menos 2 letras.';
      isValid = false;
    }

    // Validación de apellido
    if (!this.user.lastname || !/^[a-zA-Z\s]{2,}$/.test(this.user.lastname)) {
      this.errors.lastname = 'Apellido incorrecto. Debe contener al menos 2 letras.';
      isValid = false;
    }

    // Validación de teléfono
    if (!this.user.phone || !/^[0-9]{9}$/.test(this.user.phone)) {
      this.errors.phone = 'Teléfono incorrecto. Debe contener 9 dígitos.';
      isValid = false;
    }

    // Validación de email
    if (!this.user.email || !/\S+@\S+\.\S+/.test(this.user.email)) {
      this.errors.email = 'Email incorrecto.';
      isValid = false;
    }

    // Validación de contraseña
    if (!this.user.password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(this.user.password)) {
      this.errors.password = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
      isValid = false;
    }

    return isValid;
  }

  clearErrors() {
    this.errors = {
      name: '',
      lastname: '',
      phone: '',
      email: '',
      password: ''
    };
    this.showEmptyFormError = false;
    this.showEmailExistsError = false;
    this.showApiError = false;
    this.showSuccessMessage = false;
  }

  onSubmit() {
    if (!this.validateForm()) {
      this.showEmptyFormError = true;
      return;
    }

    this.apiService.register(this.user).subscribe({
      next: (response: any) => {
        // console.log('Registro exitoso:', response);
        // si el backend retorna token/usuario, guardarlos
        if (response && response.token) {
          this.authService.login(response.token);
          localStorage.setItem('token', response.token);
        }
        if (response && response.user) {
          this.authService.setUser(response.user);
          localStorage.setItem('nombre', response.user.name || '');
          localStorage.setItem('apellidos', response.user.lastname || '');
          localStorage.setItem('id', response.user.id || '');
        }
        this.showSuccessMessage = true; 
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        if (error.status === 409) {
          this.showEmailExistsError = true; 
        } else {
          this.showApiError = true;
        }
        console.error('Error en el registro:', error);
      }
    });
  }

  togglePasswordVisibility() {
    this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
  }
}
