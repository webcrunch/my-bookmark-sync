import { Routes } from '@angular/router'
import { HomeComponent } from './pages/home/home';
import { OverviewComponent } from './pages/overview/overview'
import { TagComponent } from './pages/tags/tags'




export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'overview', component: OverviewComponent },
    { path: 'tags', component: TagComponent },
    { path: '**', redirectTo: 'home' }
]