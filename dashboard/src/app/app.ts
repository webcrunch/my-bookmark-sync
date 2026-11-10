import { Component, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs";
import { SidebarComponent } from "./components/sidebar/sidebar";
import { LoginComponent } from "./pages/login/login";
import { AuthService } from "./services/auth.service";
import { BookmarkService } from "./services/bookmark.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class AppComponent {
  title = 'dashboard'
  auth = inject(AuthService)
  bookmarks = inject(BookmarkService)
  private router = inject(Router)

  // Menypanelen på mobil; stängs när man byter sida
  menuOpen = signal(false)

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false))
  }

  // Sökningen visas på /search; en tom ruta tar tillbaka till startsidan
  search(value: string) {
    this.bookmarks.query.set(value)
    const onSearch = this.router.url.startsWith('/search')
    if (value.trim() && !onSearch) this.router.navigate(['/search'])
    if (!value.trim() && onSearch) this.router.navigate(['/home'])
  }
}
