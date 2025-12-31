export interface Photo {
    id: string;
    uri: string;
    timestamp: number;
    width: number;
    height: number;
    inTrash: boolean;
    deletedAt?: number; // Timestamp cuando fue enviada a papelera
    albumId?: string;
  }
  
  export interface Album {
    id: string;
    name: string;
    createdAt: number;
    photoIds: string[];
    coverPhotoUri?: string;
  }
  
  export interface PhotoStats {
    totalTaken: number;
    totalSaved: number;
    totalDeleted: number;
    galleryCount: number;
    trashCount: number;
  }
  
  export const GALLERY_LIMIT = 15;
  export const TRASH_LIMIT = 10;
  export const TRASH_AUTO_DELETE_DAYS = 7;