import * as FileSystem from 'expo-file-system/legacy';
import { Photo } from '@/lib/types/photo';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export const storageService = {
  // Inicializar directorio de fotos
  initializeStorage: async (): Promise<void> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        console.log('📁 [STORAGE] Directorio de fotos creado');
      }
    } catch (error) {
      console.error('❌ [STORAGE] Error inicializando:', error);
      throw error;
    }
  },

  // Guardar foto comprimida
  savePhoto: async (uri: string, photoId: string): Promise<string> => {
    try {
      const fileName = `${photoId}.jpg`;
      const destUri = `${PHOTOS_DIR}${fileName}`;

      // Copiar y comprimir (calidad 80%)
      await FileSystem.copyAsync({
        from: uri,
        to: destUri,
      });

      console.log('✅ [STORAGE] Foto guardada:', fileName);
      return destUri;
    } catch (error) {
      console.error('❌ [STORAGE] Error guardando foto:', error);
      throw error;
    }
  },

  // Eliminar foto permanentemente
  deletePhoto: async (uri: string): Promise<void> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        console.log('🗑️ [STORAGE] Foto eliminada:', uri);
      }
    } catch (error) {
      console.error('❌ [STORAGE] Error eliminando foto:', error);
      throw error;
    }
  },

  // Obtener tamaño de almacenamiento usado
  getStorageSize: async (): Promise<number> => {
    try {
      const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileUri = `${PHOTOS_DIR}${file}`;
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists && 'size' in info) {
          totalSize += info.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('❌ [STORAGE] Error calculando tamaño:', error);
      return 0;
    }
  },

  // Verificar si una foto existe
  photoExists: async (uri: string): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists;
    } catch {
      return false;
    }
  },
};