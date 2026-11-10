import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookmarkService, folderTitle } from '../../services/bookmark.service';
import { LinkRowComponent } from '../../components/link-row/link-row';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, LinkRowComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  bookmarkService = inject(BookmarkService);

  // De fem mappar som har flest länkar direkt i sig
  biggestFolders = computed(() => {
    const counts = this.bookmarkService.linkCounts();
    return this.bookmarkService.bookmarks()
      .filter(b => b.isFolder && counts.get(b.id))
      .map(f => ({ id: f.id, title: folderTitle(f), path: this.bookmarkService.folderPath(f.parentId), count: counts.get(f.id)! }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  ngOnInit() {
    this.bookmarkService.loadBookmarks().subscribe();
  }
}
