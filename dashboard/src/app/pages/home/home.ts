import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookmarkService } from '../../services/bookmark.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  bookmarkService = inject(BookmarkService);

  ngOnInit() {
    this.bookmarkService.loadBookmarks().subscribe();
  }
}