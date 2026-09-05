import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Curated high-resolution professional avatars for quick selection
 */
export const ADMIN_AVATAR_PRESETS = [
  {
    id: 'preset-1',
    label: 'Official 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-2',
    label: 'Official 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-3',
    label: 'Official 3',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-4',
    label: 'Official 4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-5',
    label: 'Official 5',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  },
];

/**
 * Universal cross-platform image picker:
 * - On Web: Uses file input with FileReader returning base64 Data URL (persists in AsyncStorage reliably)
 * - On Mobile: Uses expo-document-picker returning cached image URI
 */
export const pickProfileImage = async (): Promise<string | null> => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/*';

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          resolve(result || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // Native mobile fallback using expo-document-picker
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
  } catch (err) {
    console.warn('Profile image picker error:', err);
  }
  return null;
};
