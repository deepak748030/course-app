import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    avatarUrl: { type: String, default: '' },
    blocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    /** Optional profile fields the app edits from Profile → Edit. */
    dateOfBirth: { type: String, default: '', trim: true, maxlength: 10 },
    city: { type: String, default: '', trim: true, maxlength: 80 },
    goal: { type: String, default: '', trim: true, maxlength: 120 },
    /** Category slugs the learner picked on the interests step. */
    interests: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Never leak credentials or internal fields through the API.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
