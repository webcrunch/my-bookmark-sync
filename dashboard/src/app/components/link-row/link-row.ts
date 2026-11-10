import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bookmark } from '../../models/bookmark.model';
import { BookmarkService } from '../../services/bookmark.service';

// En länk i en lista: domänens första bokstav som ikon, titel, adress och (valfritt) mappen den
// ligger i, med en länk dit i trädet. Inga favicons: de skulle hämtas från en tredje part.
@Component({
  selector: 'app-link-row',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-slate-800/40 transition">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-sm font-bold uppercase text-indigo-300"
        aria-hidden="true">{{ host().charAt(0) || '?' }}</span>
      <div class="min-w-0 flex-1">
        <a [href]="bookmark().url" target="_blank" rel="noopener"
          class="block truncate text-sm font-medium text-slate-100 hover:text-indigo-300">{{ bookmark().title || bookmark().url }}</a>
        <span class="block truncate text-xs text-slate-500">{{ host() }}{{ path() }}</span>
        @if (showFolder() && folderPath()) {
          <a [routerLink]="['/overview']" [queryParams]="{ folder: bookmark().parentId }"
            class="mt-0.5 inline-block truncate text-xs text-slate-400 hover:text-indigo-300">📁 {{ folderPath() }}</a>
        }
      </div>
    </div>
  `
})
export class LinkRowComponent {
  private service = inject(BookmarkService);
  bookmark = input.required<Bookmark>();
  showFolder = input(false);

  private parsed = computed(() => {
    try { return new URL(this.bookmark().url || ''); } catch { return null; }
  });
  host = computed(() => this.parsed()?.hostname.replace(/^www\./, '') || '');
  path = computed(() => {
    const p = this.parsed();
    return p && p.pathname !== '/' ? p.pathname : '';
  });
  folderPath = computed(() => this.service.folderPath(this.bookmark().parentId));
}
