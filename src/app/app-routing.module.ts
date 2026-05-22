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
import { ComprobanteComponent } from './comprobante/comprobante.component';
import { TipoDeEntregaComponent } from './tipo-de-entrega/tipo-de-entrega.component';
import { PagarComponent } from './pagar/pagar.component';
import { AuthGuard } from './auth.guard';
import { CompraRealizadaComponent } from './compra-realizada/compra-realizada.component';
import { ErrorEnLaCompraComponent } from './error-en-la-compra/error-en-la-compra.component';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';

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
    path: 'registrate',
    component: RegisterComponent,
  },
  { path: 'detalle-del-producto/:id', component: DetalleDelProductoComponent },
  {
    path: 'cart',
    component: CartComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'datos-del-usuario',
    component: DatosDelUsuarioComponent,
    canActivate: [AuthGuard] // Aplica el guard a la ruta
  },
  {
    path: 'comprobante',
    component: ComprobanteComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'tipo-de-entrega',
    component: TipoDeEntregaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'pagar',
    component: PagarComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'compra-realizada',
    component: CompraRealizadaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'error-en-la-compra',
    component: ErrorEnLaCompraComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mis-pedidos',
    component: MisPedidosComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**', 
    redirectTo: '/inicio',
    pathMatch: 'full',
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
