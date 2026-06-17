import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { ProyectosComponent } from './productos/proyectos.component';
import { NosotrosComponent } from './nosotros/nosotros.component';
import { ContactoComponent } from './contacto/contacto.component';
import { LoginComponent } from './login/login.component';
import { DetalleDelProductoComponent } from './detalle-del-producto/detalle-del-producto.component';
import { RegisterComponent } from './register/register.component';
import { CartComponent } from './cart/cart.component';
import { DatosDelUsuarioComponent } from './datos-del-usuario/datos-del-usuario.component';
import { TipoDeEntregaComponent } from './tipo-de-entrega/tipo-de-entrega.component';
import { PagarComponent } from './pagar/pagar.component';
import { AuthGuard } from './auth.guard';
import { CartGuard } from './cart.guard';
import { CheckoutOrderGuard } from './checkout-order.guard';
import { CompraRealizadaComponent } from './compra-realizada/compra-realizada.component';
import { ErrorEnLaCompraComponent } from './error-en-la-compra/error-en-la-compra.component';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';
import { EstablecerContrasenaComponent } from './establecer-contrasena/establecer-contrasena.component';
import { RecuperarContrasenaComponent } from './recuperar-contrasena/recuperar-contrasena.component';
import { RestablecerContrasenaComponent } from './restablecer-contrasena/restablecer-contrasena.component';

const routes: Routes = [
  {
    path: 'inicio',
    component: InicioComponent,
  },
  {
    path: '',
    component: InicioComponent,
  },
  {
    path: 'productos',
    component: ProyectosComponent,
  },
  {
    path: 'nosotros',
    component: NosotrosComponent,
  },
  {
    path: 'contacto',
    component: ContactoComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'establecer-contrasena',
    component: EstablecerContrasenaComponent,
  },
  {
    path: 'recuperar-contrasena',
    component: RecuperarContrasenaComponent,
  },
  {
    path: 'restablecer-contrasena',
    component: RestablecerContrasenaComponent,
  },
  {
    path: 'registrate',
    component: RegisterComponent,
  },
  { path: 'detalle-del-producto/:id', component: DetalleDelProductoComponent },
  {
    path: 'cart',
    component: CartComponent,
  },
  {
    path: 'datos-del-usuario',
    component: DatosDelUsuarioComponent,
    canActivate: [CartGuard],
  },
  {
    path: 'comprobante',
    redirectTo: 'datos-del-usuario',
    pathMatch: 'full',
  },
  {
    path: 'tipo-de-entrega',
    component: TipoDeEntregaComponent,
    canActivate: [CartGuard],
  },
  {
    path: 'pagar',
    component: PagarComponent,
    canActivate: [CheckoutOrderGuard],
  },
  {
    path: 'compra-realizada',
    component: CompraRealizadaComponent,
  },
  {
    path: 'error-en-la-compra',
    component: ErrorEnLaCompraComponent,
  },
  {
    path: 'mis-pedidos',
    component: MisPedidosComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: '/inicio',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
