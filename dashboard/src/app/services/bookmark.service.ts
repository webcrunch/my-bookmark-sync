import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiOrganizeResponse, Bookmark, BookmarkNode, BookmarkStats } from '../models/bookmark.model';
import { tap, catchError, of } from 'rxjs';

// Chromes inbyggda rotmappar ('0'–'3') har ingen titel, och en länk direkt i dem är osorterad
const ROOT_IDS = ['0', '1', '2', '3'];
const ROOT_TITLES: Record<string, string> = {
  '0': 'Rot (Chrome)',
  '1': 'Bokmärkesfältet',
  '2': 'Övriga bokmärken',
  '3': 'Bokmärken i mobilen'
};

export const folderTitle = (f: Pick<Bookmark, 'id' | 'title'>) =>
  f.title?.trim() || ROOT_TITLES[f.id] || `Mapp ${f.id}`;

// Adressen utan protokoll, www och avslutande snedstreck: två sparningar av samma sida blir lika
const normalizeUrl = (url: string) =>
  url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[#?].*$/, '').replace(/\/+$/, '');

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  private http = inject(HttpClient);

  private readonly N8N_GET_ALL_URL = 'https://jarllindquist.com/n8n/webhook/bookmarks-get-all';
  private readonly N8N_AI_ORGANIZE_URL = 'https://jarllindquist.com/n8n/webhook/bookmarks-ai-organize';
  private readonly N8N_APPLY_ORGANIZE_URL = 'https://jarllindquist.com/n8n/webhook/bookmarks-apply-organize';

  bookmarks = signal<Bookmark[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Sökrutan överst: delas mellan sidhuvudet och söksidan
  query = signal<string>('');

  private links = computed(() => this.bookmarks().filter(b => !b.isFolder));
  private folderById = computed(() => new Map(this.bookmarks().filter(b => b.isFolder).map(f => [f.id, f])));

  // Osorterade länkar: direkt i en av Chromes rotmappar eller utan mapp
  unorganized = computed<Bookmark[]>(() =>
    this.links().filter(b => !b.parentId || ROOT_IDS.includes(b.parentId))
  );

  // Samma adress sparad flera gånger, största grupperna först
  duplicates = computed<Bookmark[][]>(() => {
    const groups = new Map<string, Bookmark[]>();
    for (const b of this.links()) {
      if (!b.url) continue;
      const key = normalizeUrl(b.url);
      groups.set(key, [...(groups.get(key) || []), b]);
    }
    return [...groups.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length);
  });

  stats = computed<BookmarkStats>(() => ({
    totalLinks: this.links().length,
    totalFolders: this.bookmarks().filter(b => b.isFolder && !ROOT_IDS.includes(b.id)).length,
    unorganizedCount: this.unorganized().length,
    duplicateCount: this.duplicates().reduce((sum, g) => sum + g.length - 1, 0)
  }));

  // De senast sparade länkarna (createdAt), inte de sista i bokstavsordning
  recentBookmarks = computed<Bookmark[]>(() =>
    [...this.links()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10)
  );

  // Träffar på titel eller adress, alla ord måste finnas med
  searchResults = computed<Bookmark[]>(() => {
    const words = this.query().trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return this.links().filter(b => {
      const text = `${b.title} ${b.url || ''}`.toLowerCase();
      return words.every(w => text.includes(w));
    });
  });

  // Antal länkar direkt i varje mapp
  linkCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const b of this.links()) if (b.parentId) counts.set(b.parentId, (counts.get(b.parentId) || 0) + 1);
    return counts;
  });

  // Mappvägen till ett bokmärke, t.ex. "Bokmärkesfältet / Utveckling / Angular".
  // Tom för Chromes rotmappar (de ligger direkt under '0').
  folderPath(parentId: string | null | undefined): string {
    if (!parentId) return 'Utan mapp';
    const names: string[] = [];
    const seen = new Set<string>();
    let id: string | null | undefined = parentId;
    while (id && id !== '0' && !seen.has(id)) {
      seen.add(id);
      const folder = this.folderById().get(id);
      if (!folder) break;
      names.unshift(folderTitle(folder));
      id = folder.parentId;
    }
    return names.join(' / ');
  }

  loadBookmarks() {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<Bookmark[]>(this.N8N_GET_ALL_URL).pipe(
      tap(data => {
        const items = Array.isArray(data) ? data : (data as any)?.bookmarks || [];
        this.bookmarks.set(items);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('Kunde inte ladda bokmärken:', err);
        this.error.set('Kunde inte hämta bokmärkena just nu.');
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  // Skickar länkarna till n8n/ AI för analys och förslag
  getAiOrganizationSuggestions(folderId: string, bookmarks: Bookmark[]) {
    const payload = {
      folderId,
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        summary: b.summary
      }))
    };

    return this.http.post<AiOrganizeResponse>(this.N8N_AI_ORGANIZE_URL, payload);
  }

  // Skickar godkända ändringar till n8n för att skapas i postgres
  applyAiOrganization(suggestion: AiOrganizeResponse) {
    return this.http.post<{ success: boolean }>(this.N8N_APPLY_ORGANIZE_URL, suggestion).pipe(
      tap(() => {
        // ladda om alla bokmärken så trädet uppdateras automatiskt
        this.loadBookmarks().subscribe();
      })
    );
  }

  // Bygger ett hierarkiskt träd med alla mappar, på alla nivåer
  folderTree = computed<BookmarkNode[]>(() => {
    const all = this.bookmarks();
    if (!all || all.length === 0) return [];

    const folderMap = new Map<string, BookmarkNode>();

    // 1. Skapa en nod för varje mapp
    all
      .filter(b => b.isFolder)
      .forEach(f => {
        folderMap.set(f.id, {
          ...f,
          title: folderTitle(f),
          children: [],
          expanded: ROOT_IDS.includes(f.id) // Rotmapparna utfällda, resten stängda
        });
      });

    const roots: BookmarkNode[] = [];

    // 2. Koppla barn till föräldrar
    folderMap.forEach(node => {
      if (node.parentId && folderMap.has(node.parentId) && node.parentId !== node.id) {
        folderMap.get(node.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    // Undermappar i bokstavsordning; Chromes rotmappar behåller sin ordning (fältet, övriga, mobilen)
    folderMap.forEach(node => {
      if (node.id === '0') node.children!.sort((a, b) => a.id.localeCompare(b.id));
      else node.children!.sort((a, b) => a.title.localeCompare(b.title, 'sv'));
    });

    const zeroNode = roots.find(r => r.id === '0');
    if (zeroNode && zeroNode.children && zeroNode.children.length > 0) {
      return zeroNode.children;
    }

    return roots;
  });
}
