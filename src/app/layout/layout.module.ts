import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MainLayoutComponent } from './main-layout/main-layout.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [MainLayoutComponent],
  imports: [CommonModule, RouterModule, SharedModule],
  exports: [MainLayoutComponent]
})
export class LayoutModule {}
