import { Component, computed, inject, input, output } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { BookmarkService } from "../../services/bookmark.service";

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  // Värdelementet ska inte vara en egen ruta: då sträcks panelen till full höjd i layouten
  host: { class: 'contents' }
})

export class SidebarComponent {
  auth = inject(AuthService)
  private bookmarks = inject(BookmarkService)

  // Bara på mobil: panelen är utfälld
  open = input(false)
  close = output<void>()

  // Städa visar hur mycket som väntar: osorterade länkar plus dubbletter
  private toTidy = computed(() => this.bookmarks.stats().unorganizedCount + this.bookmarks.stats().duplicateCount)

  items = [
    { path: '/home', icon: '📊', label: 'Översikt' },
    { path: '/overview', icon: '🌳', label: 'Mappar' },
    { path: '/cleanup', icon: '🧹', label: 'Städa', badge: this.toTidy }
  ]
}
