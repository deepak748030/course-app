import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Created when an order is paid. One per learner per course. */
const enrollmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    completedLessons: { type: [String], default: [] },
    lastLessonId: { type: String, default: '' },
    lastPositionSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
