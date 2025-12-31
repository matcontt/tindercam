import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { usePhotos } from '@/lib/contexts/PhotoContext';
import { SwipeablePhotoCard } from '@/components/SwipeablePhotoCard';

export default function CameraScreen() {
  const { saveToGallery, isGalleryFull, galleryPhotos } = usePhotos();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoDimensions, setPhotoDimensions] = useState({ width: 0, height: 0 });
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View className="flex-1 justify-center items-center bg-black"><ActivityIndicator size="large" color="#fff" /></View>;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-black p-6">
        <Text className="text-white text-lg text-center mb-4">
          Necesitamos permiso para usar la cámara
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-blue-600 px-6 py-4 rounded-full"
        >
          <Text className="text-white font-semibold text-lg">Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (isTakingPhoto || !cameraRef.current) return;

    if (isGalleryFull) {
      Alert.alert(
        'Galería llena',
        'Has alcanzado el límite de 15 fotos. Libera espacio en la galería para tomar más.'
      );
      return;
    }

    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      if (photo) {
        setPhotoUri(photo.uri);
        setPhotoDimensions({ width: photo.width, height: photo.height });
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleSwipeComplete = () => {
    setPhotoUri(null);
    setPhotoDimensions({ width: 0, height: 0 });
  };

  return (
    <View className="flex-1 bg-black">
      {photoUri ? (
        // Modo preview swipeable
        <View className="flex-1 justify-center items-center bg-gray-900">
          <SwipeablePhotoCard
            uri={photoUri}
            width={photoDimensions.width}
            height={photoDimensions.height}
            onSwipeComplete={handleSwipeComplete}
          />
          <Text className="text-gray-400 mt-6 text-center">
            Desliza → para guardar | ← para descartar
          </Text>
        </View>
      ) : (
        // Modo cámara en vivo
        <>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            ratio="4:3"
          />

          {/* Overlay superior: stats */}
          <View className="absolute top-12 left-0 right-0 flex-row justify-center items-center z-10">
            <View className="bg-black/50 px-5 py-2 rounded-full">
              <Text className="text-white font-medium">
                {galleryPhotos.length} / 15 fotos guardadas
              </Text>
            </View>
          </View>

          {/* Botón de captura */}
          <View className="absolute bottom-12 left-0 right-0 items-center">
            <TouchableOpacity
              onPress={takePicture}
              disabled={isTakingPhoto}
              className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
                isTakingPhoto ? 'opacity-50' : ''
              }`}
              style={{ backgroundColor: isTakingPhoto ? '#666' : 'white' }}
            >
              {isTakingPhoto ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white" />
              )}
            </TouchableOpacity>

            <Text className="text-white mt-3 text-sm">
              {isTakingPhoto ? 'Capturando...' : 'Toca para tomar foto'}
            </Text>
          </View>

          {/* Botón para flip cámara */}
          <TouchableOpacity
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            className="absolute top-12 right-6 bg-black/50 p-3 rounded-full"
          >
            <Ionicons name="camera-reverse" size={28} color="white" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}