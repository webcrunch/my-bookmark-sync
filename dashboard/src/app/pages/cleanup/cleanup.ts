import { Component, inject, OnInit } from '@angular/core';
import { BookmarkService } from '../../services/bookmark.service';
import { LinkRowComponent } from '../../components/link-row/link-row';

// Det som behöver städas: samma adress sparad flera gånger, och länkar som ligger direkt i
// Chromes rotmappar. Bara visning; städningen görs i Chrome eller med Auto-organisera.
@Component({
  selector: 'app-cleanup',
  standalone: true,
  imports: [LinkRowComponent],
  template: `
    <div class="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white lg:text-3xl">Städa</h1>
        <p class="mt-1 text-sm text-slate-400">Dubbletter och osorterade länkar. Klicka på mappen för att se den i trädet.</p>
      </div>

      <section aria-labelledby="dup-title" class="space-y-3">
        <h2 id="dup-title" class="flex items-center gap-2 text-lg font-semibold text-white">
          Dubbletter
          <span class="rounded-full bg-rose-500/15 px-2 text-sm text-rose-300">{{ service.duplicates().length }}</span>
        </h2>
        @if (service.duplicates().length === 0) {
          <p class="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Inga dubbletter. Snyggt.</p>
        } @else {
          @for (group of service.duplicates(); track group[0].id) {
            <div class="rounded-xl border border-slate-800 bg-slate-900 px-2">
              <p class="px-2 pt-3 text-xs text-slate-500">Sparad {{ group.length }} gånger</p>
              <div class="divide-y divide-slate-800">
                @for (bm of group; track bm.id) {
                  <app-link-row [bookmark]="bm" [showFolder]="true"></app-link-row>
                }
              </div>
            </div>
          }
        }
      </section>

      <section aria-labelledby="unsorted-title" class="space-y-3">
        <h2 id="unsorted-title" class="flex items-center gap-2 text-lg font-semibold text-white">
          Osorterade
          <span class="rounded-full bg-amber-500/15 px-2 text-sm text-amber-300">{{ service.unorganized().length }}</span>
        </h2>
        <p class="text-sm text-slate-400">Länkar direkt i Bokmärkesfältet, Övriga bokmärken eller Mobilen. Öppna mappen och välj Auto-organisera för förslag.</p>
        @if (service.unorganized().length === 0) {
          <p class="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Allt ligger i mappar.</p>
        } @else {
          <div class="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 px-2">
            @for (bm of service.unorganized(); track bm.id) {
              <app-link-row [bookmark]="bm" [showFolder]="true"></app-link-row>
            }
          </div>
        }
      </section>
    </div>
  `
})
export class CleanupComponent implements OnInit {
  service = inject(BookmarkService);

  ngOnInit() {
    if (this.service.bookmarks().length === 0) this.service.loadBookmarks().subscribe();
  }
}
