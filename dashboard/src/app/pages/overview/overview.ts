import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookmarkService } from '../../services/bookmark.service';
import { BookmarkNode, Bookmark, AiOrganizeResponse } from '../../models/bookmark.model';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss'
})
export class OverviewComponent implements OnInit {
  bookmarkService = inject(BookmarkService);
  protected readonly Math = Math;

  // Vald mapp & Paginering
  selectedFolder = signal<BookmarkNode | null>(null);
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  // AI-organisera State & Modaler
  isAiAnalyzing = signal<boolean>(false);
  isApplyingChanges = signal<boolean>(false);
  aiSuggestion = signal<AiOrganizeResponse | null>(null);
  showAiModal = signal<boolean>(false);

  // Alla objekt i vald mapp
  currentFolderItems = computed<Bookmark[]>(() => {
    const folder = this.selectedFolder();
    if (!folder) return [];
    return this.bookmarkService.bookmarks().filter(b => b.parentId === folder.id);
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

  ngOnInit() {
    if (this.bookmarkService.bookmarks().length === 0) {
      this.bookmarkService.loadBookmarks().subscribe(() => {
        const roots = this.bookmarkService.folderTree();
        if (roots.length > 0 && !this.selectedFolder()) {
          this.selectFolder(roots[0]);
        }
      });
    } else {
      const roots = this.bookmarkService.folderTree();
      if (roots.length > 0 && !this.selectedFolder()) {
        this.selectFolder(roots[0]);
      }
    }
  }

  selectFolder(folder: BookmarkNode) {
    this.selectedFolder.set(folder);
    this.currentPage.set(1);
  }

  toggleExpand(folder: BookmarkNode, event: MouseEvent) {
    event.stopPropagation();
    folder.expanded = !folder.expanded;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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

    this.bookmarkService.getAiOrganizationSuggestions(folder.id, links).subscribe({
      next: (response) => {
        this.aiSuggestion.set(response);
        this.isAiAnalyzing.set(false);
        this.showAiModal.set(true);
      },
      error: (err) => {
        console.error('AI-analys misslyckades:', err);
        this.isAiAnalyzing.set(false);
        alert('Kunde inte genomföra AI-analysen just nu.');
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
      },
      error: (err) => {
        console.error('Kunde inte tillämpa ändringar:', err);
        this.isApplyingChanges.set(false);
        alert('Ett fel uppstod när ändringarna skulle sparas.');
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
}