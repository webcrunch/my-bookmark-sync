import { Routes } from '@angular/router'
import { HomeComponent } from './pages/home/home';
import { OverviewComponent } from './pages/overview/overview'
import { SearchComponent } from './pages/search/search'
import { CleanupComponent } from './pages/cleanup/cleanup'

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'overview', component: OverviewComponent },
    { path: 'search', component: SearchComponent },
    { path: 'cleanup', component: CleanupComponent },
    // Den tomma Taggar-sidan ersattes av Städa
    { path: 'tags', redirectTo: 'cleanup' },
    { path: '**', redirectTo: 'home' }
]
