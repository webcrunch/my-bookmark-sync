import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BookmarkService, folderTitle } from './bookmark.service';

describe('BookmarkService', () => {
  let service: BookmarkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookmarkService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });
});

describe('folderTitle', () => {
  it('uses the folder\'s own title, trimmed', () => {
    expect(folderTitle({ id: '42', title: '  Recept  ' })).toBe('Recept');
  });

  it('names Chrome\'s root folders when they have no title', () => {
    expect(folderTitle({ id: '1', title: '' })).toBe('Bokmärkesfältet');
    expect(folderTitle({ id: '2', title: '' })).toBe('Övriga bokmärken');
  });

  it('falls back to the id for any other folder without a title', () => {
    expect(folderTitle({ id: '99', title: '' })).toBe('Mapp 99');
  });
});
