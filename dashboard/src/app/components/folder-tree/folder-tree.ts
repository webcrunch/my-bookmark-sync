import { Component, inject, input, output } from '@angular/core';
import { BookmarkNode } from '../../models/bookmark.model';
import { BookmarkService } from '../../services/bookmark.service';

// Mappträdet, på alla nivåer: komponenten ritar sina egna undermappar med sig själv.
@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [FolderTreeComponent],
  template: `
    <ul class="space-y-0.5" [class]="depth() > 0 ? 'ml-3 border-l border-slate-800 pl-2' : ''"
      [attr.role]="depth() === 0 ? 'tree' : 'group'">
      @for (node of nodes(); track node.id) {
        <li role="treeitem" [attr.aria-expanded]="node.children?.length ? !!node.expanded : null"
          [attr.aria-selected]="selectedId() === node.id">
          <div class="flex items-center gap-1 rounded-lg pr-2 text-sm transition"
            [class]="selectedId() === node.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'">
            @if (node.children?.length) {
              <button type="button" (click)="node.expanded = !node.expanded"
                class="grid h-7 w-6 shrink-0 place-items-center text-xs text-slate-500 hover:text-slate-200"
                [attr.aria-label]="(node.expanded ? 'Fäll ihop ' : 'Fäll ut ') + node.title">{{ node.expanded ? '▾' : '▸' }}</button>
            } @else {
              <span class="w-6 shrink-0"></span>
            }
            <button type="button" (click)="select.emit(node)" class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
              <span class="truncate">{{ node.title }}</span>
              @if (count(node.id); as n) {
                <span class="ml-auto shrink-0 rounded-full px-2 text-xs"
                  [class]="selectedId() === node.id ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-slate-400'">{{ n }}</span>
              }
            </button>
          </div>
          @if (node.expanded && node.children?.length) {
            <app-folder-tree [nodes]="node.children!" [selectedId]="selectedId()" [depth]="depth() + 1"
              (select)="select.emit($event)"></app-folder-tree>
          }
        </li>
      }
    </ul>
  `
})
export class FolderTreeComponent {
  private service = inject(BookmarkService);
  nodes = input.required<BookmarkNode[]>();
  selectedId = input<string | null>(null);
  depth = input(0);
  select = output<BookmarkNode>();

  count(id: string) {
    return this.service.linkCounts().get(id) || 0;
  }
}
