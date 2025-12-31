import React from 'react';
import { View, Image, Text, Dimensions, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePhotos } from '@/lib/contexts/PhotoContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // un poco más tolerante

interface SwipeablePhotoCardProps {
  uri: string;
  width: number;
  height: number;
  onSwipeComplete: () => void;
}

export const SwipeablePhotoCard: React.FC<SwipeablePhotoCardProps> = ({
  uri,
  width,
  height,
  onSwipeComplete,
}) => {
  const { saveToGallery, moveToTrash, isGalleryFull, isTrashFull } = usePhotos();

  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      // Podrías guardar posición inicial si lo necesitas
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      rotate.value = (event.translationX / SCREEN_WIDTH) * 15; // rotación más pronunciada
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD;

      if (shouldSwipe) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withSpring(direction * SCREEN_WIDTH * 1.5, { damping: 15 });
        rotate.value = withSpring(direction * 30, { damping: 15 });

        runOnJS(handleSwipe)(direction > 0);
      } else {
        // snap back
        translateX.value = withSpring(0, { damping: 20 });
        rotate.value = withSpring(0, { damping: 20 });
      }
    });

  const handleSwipe = async (isRight: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (isRight) {
      if (isGalleryFull) {
        Alert.alert('Galería llena', 'Libera espacio (máx 15 fotos).');
        runOnJS(onSwipeComplete)();
        return;
      }
      await saveToGallery(uri, width, height);
    } else {
      if (isTrashFull) {
        Alert.alert('Papelera llena', 'Se eliminará la más antigua automáticamente.');
      }
      await moveToTrash(uri, width, height);
    }

    runOnJS(onSwipeComplete)();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(translateX.value / SWIPE_THRESHOLD, 0), 1),
  }));

  const dislikeOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-translateX.value / SWIPE_THRESHOLD, 0), 1),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: SCREEN_WIDTH - 40,
            height: (SCREEN_WIDTH - 40) * (height / width),
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          },
        ]}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

        {/* Overlay LIKE */}
        <Animated.View
          style={[
            likeOpacity,
            {
              position: 'absolute',
              top: 40,
              right: 40,
              backgroundColor: 'rgba(34,197,94,0.7)',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 999,
            },
          ]}
        >
          <Text className="text-white text-3xl font-bold">❤️ Guardar</Text>
        </Animated.View>

        {/* Overlay DISLIKE */}
        <Animated.View
          style={[
            dislikeOpacity,
            {
              position: 'absolute',
              top: 40,
              left: 40,
              backgroundColor: 'rgba(239,68,68,0.7)',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 999,
            },
          ]}
        >
          <Text className="text-white text-3xl font-bold">❌ Descartar</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};