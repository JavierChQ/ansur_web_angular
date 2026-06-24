import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ContactConfigService } from '../services/contact-config.service';
import { ContactoComponent } from './contacto.component';

describe('ContactoComponent', () => {
  let component: ContactoComponent;
  let fixture: ComponentFixture<ContactoComponent>;

  const configSubject = new BehaviorSubject(null);
  const loadErrorSubject = new BehaviorSubject(false);
  const loadingSubject = new BehaviorSubject(false);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContactoComponent],
      providers: [
        {
          provide: ContactConfigService,
          useValue: {
            config$: configSubject.asObservable(),
            loadError$: loadErrorSubject.asObservable(),
            loading$: loadingSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
