import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleDelProductoComponent } from './detalle-del-producto.component';

describe('DetalleDelProductoComponent', () => {
  let component: DetalleDelProductoComponent;
  let fixture: ComponentFixture<DetalleDelProductoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetalleDelProductoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalleDelProductoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
