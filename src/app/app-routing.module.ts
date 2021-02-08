import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'video', loadChildren: () => import('./video/video.module').then(m => m.VideoModule) },
  { path: '', pathMatch: 'full', redirectTo: 'video'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
