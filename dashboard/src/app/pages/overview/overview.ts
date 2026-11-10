import { Component, inject, signal, computed, OnInit, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BookmarkService } from '../../services/bookmark.service';
import { BookmarkNode, Bookmark, AiOrganizeResponse } from '../../models/bookmark.model';
import { FolderTreeComponent } from '../../components/folder-tree/folder-tree';
import { LinkRowComponent } from '../../components/link-row/link-row';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FolderTreeComponent, LinkRowComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.scss'
})
export class OverviewComponent implements OnInit {
  bookmarkService = inject(BookmarkService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected readonly Math = Math;
  private content = viewChild<ElementRef<HTMLElement>>('content');

  // Vald mapp (via id, så att den överlever en omladdning av trädet) & Paginering
  private selectedId = signal<string | null>(null);
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // ?folder=<id> från länkar på andra sidor
  private folderParam = toSignal(this.route.queryParamMap.pipe(map(p => p.get('folder'))));

  // AI-organisera State & Modaler
  isAiAnalyzing = signal<boolean>(false);
  isApplyingChanges = signal<boolean>(false);
  aiSuggestion = signal<AiOrganizeResponse | null>(null);
  showAiModal = signal<boolean>(false);
  message = signal<string>('');

  selectedFolder = computed<BookmarkNode | null>(() => {
    const id = this.selectedId();
    return id ? this.findNode(this.bookmarkService.folderTree(), id)?.node || null : null;
  });

  selectedPath = computed(() => this.bookmarkService.folderPath(this.selectedFolder()?.parentId));

  // Alla objekt i vald mapp: undermappar först, sedan länkar
  currentFolderItems = computed<Bookmark[]>(() => {
    const id = this.selectedId();
    if (!id) return [];
    return this.bookmarkService.bookmarks()
      .filter(b => b.parentId === id)
      .sort((a, b) => Number(b.isFolder) - Number(a.isFolder));
  });

  // Endast länkar i den valda mappen
  currentFolderLinks = computed<Bookmark[]>(() => {
    return this.currentFolderItems().filter(b => !b.isFolder);
  });

  totalPages = computed<number>(() => {
    const totalItems = this.currentFolderItems().length;
    return Math.max(1, Math.ceil(totalItems / this.pageSize()));
  });

  paginatedItems = computed<Bookmark[]>(() => {
    const items = this.currentFolderItems();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return items.slice(startIndex, startIndex + size);
  });

  constructor() {
    // Välj mappen från ?folder= (eller den första) när trädet finns, och fäll ut vägen dit
    effect(() => {
      const tree = this.bookmarkService.folderTree();
      if (tree.length === 0) return;
      const wanted = this.folderParam();
      const found = wanted ? this.findNode(tree, wanted) : null;
      if (found) {
        found.ancestors.forEach(a => (a.expanded = true));
        this.selectedId.set(found.node.id);
        this.currentPage.set(1);
      } else if (!this.selectedId()) {
        this.selectedId.set(tree[0].id);
      }
    });
  }

  ngOnInit() {
    if (this.bookmarkService.bookmarks().length === 0) {
      this.bookmarkService.loadBookmarks().subscribe();
    }
  }

  selectFolder(folder: Pick<Bookmark, 'id'>) {
    // Adressen visar vald mapp, så att den går att länka till och överlever en omladdning
    this.router.navigate([], { queryParams: { folder: folder.id }, replaceUrl: true });
    this.message.set('');
    // På mobil ligger innehållet under trädet: hoppa ner till det
    if (window.matchMedia('(max-width: 767px)').matches) {
      setTimeout(() => this.content()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // AI Actions
  startAiOrganize() {
    const folder = this.selectedFolder();
    const links = this.currentFolderLinks();

    if (!folder || links.length === 0) return;

    this.isAiAnalyzing.set(true);
    this.message.set('');

    this.bookmarkService.getAiOrganizationSuggestions(folder.id, links).subscribe({
      next: (response) => {
        this.aiSuggestion.set(response);
        this.isAiAnalyzing.set(false);
        if (response?.categories?.length) {
          this.showAiModal.set(true);
        } else {
          this.message.set('AI:n hittade inga mappar att föreslå för den här mappen.');
        }
      },
      error: (err) => {
        console.error('AI-analys misslyckades:', err);
        this.isAiAnalyzing.set(false);
        this.message.set('Kunde inte genomföra AI-analysen just nu. Försök igen om en stund.');
      }
    });
  }

  applyAiSuggestion() {
    const suggestion = this.aiSuggestion();
    if (!suggestion) return;

    this.isApplyingChanges.set(true);

    this.bookmarkService.applyAiOrganization(suggestion).subscribe({
      next: () => {
        this.isApplyingChanges.set(false);
        this.closeModal();
        this.message.set('Mapparna är skapade. Chrome får ändringen inom en minut.');
      },
      error: (err) => {
        console.error('Kunde inte tillämpa ändringar:', err);
        this.isApplyingChanges.set(false);
        this.closeModal();
        this.message.set('Ändringarna kunde inte sparas. Ingenting har flyttats.');
      }
    });
  }

  closeModal() {
    this.showAiModal.set(false);
    this.aiSuggestion.set(null);
  }

  getBookmarkTitle(id: string): string {
    const item = this.bookmarkService.bookmarks().find(b => b.id === id);
    return item?.title || `Länk #${id}`;
  }

  private findNode(nodes: BookmarkNode[], id: string, ancestors: BookmarkNode[] = []): { node: BookmarkNode; ancestors: BookmarkNode[] } | null {
    for (const node of nodes) {
      if (node.id === id) return { node, ancestors };
      const hit = this.findNode(node.children || [], id, [...ancestors, node]);
      if (hit) return hit;
    }
    return null;
  }
}
