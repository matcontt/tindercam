import AsyncStorage from '@react-native-async-storage/async-storage';
import { Photo, PhotoStats, GALLERY_LIMIT, TRASH_LIMIT, TRASH_AUTO_DELETE_DAYS } from '@/lib/types/photo';
import { storageService } from './storageService';

const PHOTOS_KEY = '@camera_tinder:photos';
const STATS_KEY = '@camera_tinder:stats';

export const photoService = {
  // Obtener todas las fotos
  getAllPhotos: async (): Promise<Photo[]> => {
    try {
      const photosJson = await AsyncStorage.getItem(PHOTOS_KEY);
      if (!photosJson) return [];
      
      const photos: Photo[] = JSON.parse(photosJson);
      
      // Limpiar fotos de papelera antiguas (>7 días)
      await photoService.cleanOldTrash(photos);
      
      return photos;
    } catch (error) {
      console.error('❌ [PHOTOS] Error cargando fotos:', error);
      return [];
    }
  },

  // Guardar foto en galería
  saveToGallery: async (uri: string, width: number, height: number): Promise<Photo | null> => {
    try {
      const photos = await photoService.getAllPhotos();
      const galleryPhotos = photos.filter(p => !p.inTrash);

      // Verificar límite de galería
      if (galleryPhotos.length >= GALLERY_LIMIT) {
        console.warn('⚠️ [PHOTOS] Galería llena');
        return null;
      }

      const photoId = Date.now().toString();
      const savedUri = await storageService.savePhoto(uri, photoId);

      const newPhoto: Photo = {
        id: photoId,
        uri: savedUri,
        timestamp: Date.now(),
        width,
        height,
        inTrash: false,
      };

      photos.push(newPhoto);
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
      
      // Actualizar estadísticas
      await photoService.updateStats('saved');

      console.log('✅ [PHOTOS] Foto guardada en galería');
      return newPhoto;
    } catch (error) {
      console.error('❌ [PHOTOS] Error guardando en galería:', error);
      return null;
    }
  },

  // Mover foto a papelera
  moveToTrash: async (uri: string, width: number, height: number): Promise<boolean> => {
    try {
      const photos = await photoService.getAllPhotos();
      const trashPhotos = photos.filter(p => p.inTrash);

      // Si la papelera está llena, eliminar la más antigua
      if (trashPhotos.length >= TRASH_LIMIT) {
        const oldest = trashPhotos.sort((a, b) => (a.deletedAt || 0) - (b.deletedAt || 0))[0];
        await photoService.deletePhotoCompletely(oldest.id);
      }

      const photoId = Date.now().toString();
      const savedUri = await storageService.savePhoto(uri, photoId);

      const newPhoto: Photo = {
        id: photoId,
        uri: savedUri,
        timestamp: Date.now(),
        width,
        height,
        inTrash: true,
        deletedAt: Date.now(),
      };

      const updatedPhotos = await photoService.getAllPhotos();
      updatedPhotos.push(newPhoto);
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));
      
      // Actualizar estadísticas
      await photoService.updateStats('deleted');

      console.log('🗑️ [PHOTOS] Foto movida a papelera');
      return true;
    } catch (error) {
      console.error('❌ [PHOTOS] Error moviendo a papelera:', error);
      return false;
    }
  },

  // Recuperar foto de la papelera
  recoverFromTrash: async (photoId: string): Promise<boolean> => {
    try {
      const photos = await photoService.getAllPhotos();
      const galleryPhotos = photos.filter(p => !p.inTrash);

      if (galleryPhotos.length >= GALLERY_LIMIT) {
        console.warn('⚠️ [PHOTOS] Galería llena, no se puede recuperar');
        return false;
      }

      const photoIndex = photos.findIndex(p => p.id === photoId);
      if (photoIndex === -1) return false;

      photos[photoIndex].inTrash = false;
      photos[photoIndex].deletedAt = undefined;

      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
      console.log('♻️ [PHOTOS] Foto recuperada de papelera');
      return true;
    } catch (error) {
      console.error('❌ [PHOTOS] Error recuperando foto:', error);
      return false;
    }
  },

  // Eliminar foto permanentemente
  deletePhotoCompletely: async (photoId: string): Promise<boolean> => {
    try {
      const photos = await photoService.getAllPhotos();
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) return false;

      // Eliminar archivo
      await storageService.deletePhoto(photo.uri);

      // Eliminar de la lista
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));

      console.log('💀 [PHOTOS] Foto eliminada permanentemente');
      return true;
    } catch (error) {
      console.error('❌ [PHOTOS] Error eliminando foto:', error);
      return false;
    }
  },

  // Limpiar papelera automáticamente (fotos > 7 días)
  cleanOldTrash: async (photos: Photo[]): Promise<void> => {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - (TRASH_AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000);

      const photosToDelete = photos.filter(
        p => p.inTrash && p.deletedAt && p.deletedAt < sevenDaysAgo
      );

      if (photosToDelete.length === 0) return;

      console.log(`🗑️ [PHOTOS] Limpiando ${photosToDelete.length} fotos antiguas de papelera...`);

      for (const photo of photosToDelete) {
        await photoService.deletePhotoCompletely(photo.id);
      }
    } catch (error) {
      console.error('❌ [PHOTOS] Error limpiando papelera:', error);
    }
  },

  // Obtener fotos de galería
  getGalleryPhotos: async (): Promise<Photo[]> => {
    const photos = await photoService.getAllPhotos();
    return photos.filter(p => !p.inTrash).sort((a, b) => b.timestamp - a.timestamp);
  },

  // Obtener fotos de papelera
  getTrashPhotos: async (): Promise<Photo[]> => {
    const photos = await photoService.getAllPhotos();
    return photos.filter(p => p.inTrash).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },

  // Obtener estadísticas
  getStats: async (): Promise<PhotoStats> => {
    try {
      const statsJson = await AsyncStorage.getItem(STATS_KEY);
      const photos = await photoService.getAllPhotos();
      
      const baseStats: PhotoStats = statsJson 
        ? JSON.parse(statsJson) 
        : { totalTaken: 0, totalSaved: 0, totalDeleted: 0, galleryCount: 0, trashCount: 0 };

      // Actualizar contadores actuales
      baseStats.galleryCount = photos.filter(p => !p.inTrash).length;
      baseStats.trashCount = photos.filter(p => p.inTrash).length;

      return baseStats;
    } catch (error) {
      console.error('❌ [PHOTOS] Error obteniendo estadísticas:', error);
      return { totalTaken: 0, totalSaved: 0, totalDeleted: 0, galleryCount: 0, trashCount: 0 };
    }
  },

  // Actualizar estadísticas
  updateStats: async (action: 'saved' | 'deleted'): Promise<void> => {
    try {
      const stats = await photoService.getStats();
      stats.totalTaken += 1;
      
      if (action === 'saved') {
        stats.totalSaved += 1;
      } else {
        stats.totalDeleted += 1;
      }

      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('❌ [PHOTOS] Error actualizando estadísticas:', error);
    }
  },

  // Vaciar papelera completamente
  emptyTrash: async (): Promise<boolean> => {
    try {
      const trashPhotos = await photoService.getTrashPhotos();
      
      for (const photo of trashPhotos) {
        await photoService.deletePhotoCompletely(photo.id);
      }

      console.log('🗑️ [PHOTOS] Papelera vaciada completamente');
      return true;
    } catch (error) {
      console.error('❌ [PHOTOS] Error vaciando papelera:', error);
      return false;
    }
  },
};