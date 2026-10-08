import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    author: { type: String, required: true, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, default: '', trim: true, maxlength: 2000 },
    /** Hidden reviews stay in the DB but do not count toward the course rating. */
    visible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// One review per learner per course — updates upsert instead of duplicating.
reviewSchema.index({ course: 1, user: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
