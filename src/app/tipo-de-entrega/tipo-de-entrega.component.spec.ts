import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoDeEntregaComponent } from './tipo-de-entrega.component';

describe('TipoDeEntregaComponent', () => {
  let component: TipoDeEntregaComponent;
  let fixture: ComponentFixture<TipoDeEntregaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TipoDeEntregaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TipoDeEntregaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
