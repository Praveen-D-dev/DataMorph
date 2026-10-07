import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { DashboardContainerComponent } from './features/dashboard/dashboard-container/dashboard-container.component';
import { DatasetService } from './core/services/dataset.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    DashboardContainerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  datasetService = inject(DatasetService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.datasetService.loadDatasets().subscribe();
  }
}

