import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ContactConfig, ContactConfigService } from '../services/contact-config.service';

@Component({
  selector: 'app-contacto',
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css'],
})
export class ContactoComponent implements OnInit, OnDestroy {
  config: ContactConfig | null = null;
  loadError = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly contactConfigService: ContactConfigService) {}

  ngOnInit(): void {
    this.contactConfigService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        this.config = config;
      });

    this.contactConfigService.loadError$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loadError) => {
        this.loadError = loadError;
      });

    this.contactConfigService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
