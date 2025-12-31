import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Photo, PhotoStats, GALLERY_LIMIT, TRASH_LIMIT } from '@/lib/types/photo';
import { photoService } from '@/lib/services/photoService';
import { storageService } from '@/lib/services/storageService';

interface PhotoContextType {
  photos: Photo[];
  galleryPhotos: Photo[];
  trashPhotos: Photo[];
  stats: PhotoStats;
  loading: boolean;
  isGalleryFull: boolean;
  isTrashFull: boolean;
  saveToGallery: (uri: string, width: number, height: number) => Promise<Photo | null>;
  moveToTrash: (uri: string, width: number, height: number) => Promise<boolean>;
  recoverFromTrash: (photoId: string) => Promise<boolean>;
  deletePhoto: (photoId: string) => Promise<boolean>;
  emptyTrash: () => Promise<boolean>;
  refreshPhotos: () => Promise<void>;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export const PhotoProvider = ({ children }: { children: ReactNode }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>([]);
  const [trashPhotos, setTrashPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<PhotoStats>({
    totalTaken: 0,
    totalSaved: 0,
    totalDeleted: 0,
    galleryCount: 0,
    trashCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeStorage();
    loadPhotos();
  }, []);

  const initializeStorage = async () => {
    try {
      await storageService.initializeStorage();
    } catch (error) {
      console.error('Error inicializando storage:', error);
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const [allPhotos, gallery, trash, photoStats] = await Promise.all([
        photoService.getAllPhotos(),
        photoService.getGalleryPhotos(),
        photoService.getTrashPhotos(),
        photoService.getStats(),
      ]);

      setPhotos(allPhotos);
      setGalleryPhotos(gallery);
      setTrashPhotos(trash);
      setStats(photoStats);

      console.log(`📊 Fotos cargadas: ${gallery.length} en galería, ${trash.length} en papelera`);
    } catch (error) {
      console.error('Error cargando fotos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToGallery = async (uri: string, width: number, height: number): Promise<Photo | null> => {
    const newPhoto = await photoService.saveToGallery(uri, width, height);
    if (newPhoto) {
      await loadPhotos();
    }
    return newPhoto;
  };

  const moveToTrash = async (uri: string, width: number, height: number): Promise<boolean> => {
    const success = await photoService.moveToTrash(uri, width, height);
    if (success) {
      await loadPhotos();
    }
    return success;
  };

  const recoverFromTrash = async (photoId: string): Promise<boolean> => {
    const success = await photoService.recoverFromTrash(photoId);
    if (success) {
      await loadPhotos();
    }
    return success;
  };

  const deletePhoto = async (photoId: string): Promise<boolean> => {
    const success = await photoService.deletePhotoCompletely(photoId);
    if (success) {
      await loadPhotos();
    }
    return success;
  };

  const emptyTrash = async (): Promise<boolean> => {
    const success = await photoService.emptyTrash();
    if (success) {
      await loadPhotos();
    }
    return success;
  };

  const refreshPhotos = async () => {
    await loadPhotos();
  };

  const isGalleryFull = galleryPhotos.length >= GALLERY_LIMIT;
  const isTrashFull = trashPhotos.length >= TRASH_LIMIT;

  return (
    <PhotoContext.Provider
      value={{
        photos,
        galleryPhotos,
        trashPhotos,
        stats,
        loading,
        isGalleryFull,
        isTrashFull,
        saveToGallery,
        moveToTrash,
        recoverFromTrash,
        deletePhoto,
        emptyTrash,
        refreshPhotos,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
};

export const usePhotos = () => {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
};