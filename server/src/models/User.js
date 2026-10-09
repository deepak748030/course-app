import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Optional: phone-OTP learners have no email; admins and older accounts do. */
    email: { type: String, default: '', lowercase: true, trim: true },
    /** The learner's Indian mobile (10 digits). Sign-in is by this number + OTP. */
    phone: { type: String, trim: true, default: '' },
    /** Only email+password accounts (admins, older learners) have a hash. */
    passwordHash: { type: String, default: '' },
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

// Accounts are looked up by email or phone; empty values never collide with each other.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $gt: '' } } }
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $gt: '' } } }
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
