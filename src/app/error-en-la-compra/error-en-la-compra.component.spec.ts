import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorEnLaCompraComponent } from './error-en-la-compra.component';

describe('ErrorEnLaCompraComponent', () => {
  let component: ErrorEnLaCompraComponent;
  let fixture: ComponentFixture<ErrorEnLaCompraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ErrorEnLaCompraComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ErrorEnLaCompraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
