import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeComponent } from '../home/home.component';
import { AboutComponent } from '../about/about.component';
import { ProjectsComponent } from '../projects/projects.component';
import { ExperienceComponent } from '../experience/experience.component';
import { ContactComponent } from '../contact/contact.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [HomeComponent, AboutComponent, ProjectsComponent, ExperienceComponent, ContactComponent],
  imports: [CommonModule, SharedModule],
  exports: [HomeComponent]
})
export class PortfolioModule {}
