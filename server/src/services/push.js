/**
 * Push delivery through Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Expo relays to Firebase (Android) and APNs (iOS), so the app only needs its Expo push token.
 *
 * Production needs: the app built with EAS (dev or store build, not Expo Go), FCM and APNs credentials set up
 * for the Expo project (`eas credentials`), and optionally EXPO_ACCESS_TOKEN enabled under "Enhanced push
 * security" in the Expo dashboard so only this server can send.
 */
import { PushToken } from '../models/PushToken.js';

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo accepts up to 100 messages per request.

export const isExpoPushToken = (value) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(value);

/** Sends messages in chunks. Returns counts and the tokens Expo says are no longer valid. */
export async function sendExpoMessages(messages) {
  const result = { sent: 0, failed: 0, invalidTokens: [] };
  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  for (let start = 0; start < messages.length; start += CHUNK_SIZE) {
    const chunk = messages.slice(start, start + CHUNK_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk) });
      const payload = await response.json().catch(() => ({}));
      const tickets = Array.isArray(payload.data) ? payload.data : [];
      if (!response.ok || tickets.length !== chunk.length) {
        result.failed += chunk.length;
        console.error('[push] Expo rejected a batch:', response.status, payload.errors ?? payload);
        continue;
      }
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          result.sent += 1;
          return;
        }
        result.failed += 1;
        // The device uninstalled the app or revoked permission: stop sending to that token.
        if (ticket.details?.error === 'DeviceNotRegistered') result.invalidTokens.push(chunk[index].to);
        console.warn('[push] ticket error:', ticket.message);
      });
    } catch (err) {
      result.failed += chunk.length;
      console.error('[push] could not reach Expo:', err.message);
    }
  }
  return result;
}

/** Builds one message per device. `data` is what the app reads when a notification is tapped. */
export function buildMessages(tokens, { notificationId, title, body, kind, courseSlug }) {
  return tokens.map((row) => ({
    to: row.token,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    data: { notificationId: String(notificationId), kind, ...(courseSlug ? { courseId: courseSlug } : {}) },
  }));
}

/** Loads the devices for the notification's audience. */
export async function devicesFor(notification) {
  const filter = notification.audience === 'user' ? { user: notification.user } : {};
  return PushToken.find(filter).select('token').lean();
}

/** Forgets tokens Expo reported as dead, so the next send does not hit them again. */
export async function forgetTokens(tokens) {
  if (tokens.length) await PushToken.deleteMany({ token: { $in: tokens } });
}
