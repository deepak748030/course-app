/**
 * Profile photo picker.
 *
 * Wrapped here so screens never talk to the picker directly: permission handling, the
 * cancelled case and the "this image cannot be read" case all resolve to one result shape.
 *
 * Where the photo is kept: on web the picker returns a base64 data URI, which survives a
 * reload; on native it returns a local file URI in the app cache. Neither leaves the device.
 */

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PhotoResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'permission' | 'cancelled' | 'failed' };

export async function pickProfilePhoto(): Promise<PhotoResult> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { ok: false, reason: 'permission' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      // Web has no file-system path to point at later, so it needs the bytes inline.
      base64: Platform.OS === 'web',
    });

    if (result.canceled) return { ok: false, reason: 'cancelled' };
    const asset = result.assets?.[0];
    if (!asset) return { ok: false, reason: 'failed' };

    const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    if (!uri) return { ok: false, reason: 'failed' };
    return { ok: true, uri };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
