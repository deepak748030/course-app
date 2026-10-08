import mongoose from 'mongoose';

const { Schema } = mongoose;

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', trim: true },
    minutes: { type: Number, required: true, min: 1, max: 600 },
    /** Free preview lesson — playable without purchase. */
    isPreview: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const sectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    summary: { type: String, default: '', trim: true },
    lessons: { type: [lessonSchema], default: [] },
  },
  { _id: true, timestamps: false }
);

const courseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    promise: { type: String, default: '', trim: true, maxlength: 280 },
    description: { type: String, default: '', trim: true },
    coverUrl: { type: String, default: '', trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    language: { type: String, default: 'English', trim: true },
    priceInr: { type: Number, required: true, min: 0 },
    /** Only set when the course runs a discount. */
    listPriceInr: { type: Number, min: 0 },
    published: { type: Boolean, default: false, index: true },
    isPopular: { type: Boolean, default: false },
    isBeginnerPick: { type: Boolean, default: false },
    /** Denormalised from visible reviews — recomputed on review changes. */
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    outcomes: { type: [String], default: [] },
    equipment: { type: [String], default: [] },
    audience: { type: String, default: '', trim: true },
    sections: { type: [sectionSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('lessonCount').get(function lessonCount() {
  return this.sections.reduce((sum, section) => sum + section.lessons.length, 0);
});

courseSchema.virtual('totalMinutes').get(function totalMinutes() {
  return this.sections.reduce(
    (sum, section) => sum + section.lessons.reduce((s, lesson) => s + lesson.minutes, 0),
    0
  );
});

export const Course = mongoose.model('Course', courseSchema);
