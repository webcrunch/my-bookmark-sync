import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiOrganizeResponse, Bookmark, BookmarkNode, BookmarkStats } from '../models/bookmark.model';
import { tap, catchError, of } from 'rxjs';

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

  // Beräknad statistik
  stats = computed<BookmarkStats>(() => {
    const list = this.bookmarks();

    // Filtrera länkar vs mappar (exkludera Chrome:s osynliga rot id '0')
    const links = list.filter(b => !b.isFolder);
    const folders = list.filter(b => b.isFolder && b.id !== '0');

    // Osorterade länkar (ligger direkt i rot '0', '1', '2', '3' eller saknar parentId)
    const unorganized = links.filter(b =>
      !b.parentId || ['0', '1', '2', '3'].includes(b.parentId)
    );

    // Länkar med AI-metadata
    const aiTagged = links.filter(b =>
      (b.summary && b.summary.trim().length > 0) ||
      (b.tags && b.tags.length > 0)
    );

    return {
      totalLinks: links.length,
      totalFolders: folders.length,
      unorganizedCount: unorganized.length,
      aiTaggedCount: aiTagged.length
    };
  });

  // Senaste länkarna
  recentBookmarks = computed<Bookmark[]>(() => {
    return this.bookmarks()
      .filter(b => !b.isFolder)
      .slice(-10)
      .reverse();
  });

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
        this.error.set('Kunde inte nå n8n/Postgres');
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

  // Bygger ett hierarkiskt träd med alla mappar
  folderTree = computed<BookmarkNode[]>(() => {
    const all = this.bookmarks();
    if (!all || all.length === 0) return [];

    const folderMap = new Map<string, BookmarkNode>();

    // 1. Skapa en nod för varje mapp
    all
      .filter(b => b.isFolder)
      .forEach(f => {
        let title = f.title;
        // Ge Chromes interna rotmappar tydliga namn om de saknar titel
        if (!title || title.trim() === '') {
          if (f.id === '0') title = 'Rot (Chrome)';
          else if (f.id === '1') title = 'Bokmärkesfältet';
          else if (f.id === '2') title = 'Övriga bokmärken';
          else if (f.id === '3') title = 'Bokmärken i mobilen';
          else title = `Mapp ${f.id}`;
        }

        folderMap.set(f.id, {
          ...f,
          title,
          children: [],
          expanded: true // Ha dem utfällda som standard så du ser direkt
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

    const zeroNode = roots.find(r => r.id === '0');
    if (zeroNode && zeroNode.children && zeroNode.children.length > 0) {
      return zeroNode.children;
    }

    return roots;
  });
}