import React from 'react';
import { Stack } from 'expo-router';
import { PhotoProvider } from '@/lib/contexts/PhotoContext';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

// Importante: Esto carga los estilos globales de Tailwind (NativeWind)
import '@/global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // ThemeProvider de React Navigation para colores de navegación
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* PhotoProvider para el estado global de fotos */}
      <PhotoProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            // Puedes personalizar más el header global si lo necesitas
            contentStyle: {
              backgroundColor: colorScheme === 'dark' ? '#000' : '#f9fafb',
            },
          }}
        >
          {/* Pantalla de tabs (cámara, galería, papelera) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Modal para ver foto en detalle */}
          <Stack.Screen
            name="photo/[id]"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Foto',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#111827' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#111827',
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          />
        </Stack>
      </PhotoProvider>
    </ThemeProvider>
  );
}