import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosDelUsuarioComponent } from './datos-del-usuario.component';

describe('DatosDelUsuarioComponent', () => {
  let component: DatosDelUsuarioComponent;
  let fixture: ComponentFixture<DatosDelUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatosDelUsuarioComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DatosDelUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
