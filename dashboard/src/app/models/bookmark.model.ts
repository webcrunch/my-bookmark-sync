export interface Bookmark {
    id: string;
    title: string;
    url?: string | null;
    parentId?: string | null;
    isFolder: boolean;
    source?: string;
    summary?: string | null;
    tags?: string[] | null;
    createdAt?: string;
    updatedAt?: string;
}


export interface BookmarkStats {
    totalLinks: number;
    totalFolders: number;
    unorganizedCount: number;
    // Extra exemplar av en adress som redan finns (tre likadana = två dubbletter)
    duplicateCount: number;
}

export interface BookmarkNode extends Bookmark {
    children?: BookmarkNode[],
    expanded?: boolean;
}


export interface AiFolderSuggestion {
    folderName: string;
    bookmarkIds: string[];
}

export interface AiOrganizeResponse {
    targetFolderId: string;
    categories: AiFolderSuggestion[];
}