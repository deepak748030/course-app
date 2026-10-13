import { Notification } from '../models/Notification.js';
import { buildMessages, devicesFor, forgetTokens, sendExpoMessages } from './push.js';

/**
 * Pushes a saved notification to its devices and records the outcome on the notification.
 * Runs after the admin request has been answered, so a slow push service never blocks the dashboard.
 */
export async function deliverNotification(notificationId) {
  const notification = await Notification.findById(notificationId).populate('course', 'slug');
  if (!notification) return;

  try {
    notification.pushStatus = 'sending';
    await notification.save();

    const devices = await devicesFor(notification);
    if (devices.length === 0) {
      notification.pushStatus = 'no-devices';
      notification.pushDevices = 0;
      await notification.save();
      return;
    }

    const messages = buildMessages(devices, {
      notificationId: notification._id,
      title: notification.title,
      body: notification.body,
      kind: notification.kind,
      courseSlug: notification.course?.slug,
    });
    const result = await sendExpoMessages(messages);
    await forgetTokens(result.invalidTokens);

    notification.pushDevices = devices.length;
    notification.pushFailed = result.failed;
    notification.pushStatus = result.sent === 0 ? 'failed' : 'sent';
    await notification.save();
  } catch (err) {
    console.error('[push] delivery failed:', err.message);
    notification.pushStatus = 'failed';
    await notification.save().catch(() => {});
  }
}
