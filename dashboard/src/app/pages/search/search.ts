import { Component, inject, OnInit } from '@angular/core';
import { BookmarkService } from '../../services/bookmark.service';
import { LinkRowComponent } from '../../components/link-row/link-row';

// Träffarna för sökrutan i sidhuvudet (titel och adress), med mappen varje träff ligger i
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [LinkRowComponent],
  template: `
    <div class="mx-auto max-w-4xl space-y-4">
      <h1 class="text-2xl font-bold tracking-tight text-white">Sökresultat</h1>
      <p class="text-sm text-slate-400" role="status">
        @if (service.query().trim()) {
          {{ service.searchResults().length }} träffar på "{{ service.query().trim() }}"
        } @else {
          Skriv i sökrutan ovanför.
        }
      </p>
      @if (service.searchResults().length) {
        <div class="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 px-2">
          @for (bm of service.searchResults(); track bm.id) {
            <app-link-row [bookmark]="bm" [showFolder]="true"></app-link-row>
          }
        </div>
      }
    </div>
  `
})
export class SearchComponent implements OnInit {
  service = inject(BookmarkService);

  ngOnInit() {
    if (this.service.bookmarks().length === 0) this.service.loadBookmarks().subscribe();
  }
}
