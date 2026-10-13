import { Course } from '../../models/Course.js';
import { Notification } from '../../models/Notification.js';
import { PushToken } from '../../models/PushToken.js';
import { User } from '../../models/User.js';
import { deliverNotification } from '../../services/notificationDelivery.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** GET /api/admin/notifications — history with delivery results, plus how many devices can be reached. */
export const listNotifications = asyncHandler(async (_req, res) => {
  const [items, devices, learnersWithDevices] = await Promise.all([
    Notification.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'name email')
      .populate('course', 'title slug')
      .lean(),
    PushToken.countDocuments(),
    PushToken.distinct('user').then((ids) => ids.length),
  ]);
  res.json({ notifications: items, devices, learnersWithDevices });
});

/** POST /api/admin/notifications — saves the message, answers at once, then pushes in the background. */
export const sendNotification = asyncHandler(async (req, res) => {
  const { audience, userId, title, body, kind, courseId } = req.body;

  if (audience === 'user') {
    const learner = await User.exists({ _id: userId, role: 'user' });
    if (!learner) throw new HttpError(404, 'That learner does not exist');
  }
  if (courseId && !(await Course.exists({ _id: courseId }))) throw new HttpError(404, 'That course does not exist');

  const notification = await Notification.create({
    title,
    body,
    kind,
    audience,
    user: audience === 'user' ? userId : null,
    course: courseId || null,
    sentBy: req.user._id,
  });

  // Answer now; the pushes go out after the response.
  setImmediate(() => {
    deliverNotification(notification._id).catch((err) => console.error('[push] background send failed:', err.message));
  });

  const populated = await Notification.findById(notification._id)
    .populate('user', 'name email')
    .populate('course', 'title slug')
    .lean();
  res.status(201).json({ notification: populated });
});
