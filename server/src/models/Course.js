import mongoose from 'mongoose';

const { Schema } = mongoose;

const ingredientSchema = new Schema(
  {
    item: { type: String, required: true, trim: true, maxlength: 140 },
    quantity: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { _id: false }
);

/** Standardised make-sheet a dairy worker follows along with the lesson. */
const recipeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    servings: { type: Number, required: true, min: 1, max: 500 },
    prepMinutes: { type: Number, default: 0, min: 0 },
    cookMinutes: { type: Number, default: 0, min: 0 },
    ingredients: { type: [ingredientSchema], default: [] },
    steps: { type: [String], default: [] },
    tips: { type: [String], default: [] },
  },
  { _id: false }
);

/** One encoded version of a lesson video. Each quality is its own private B2 object. */
const lessonVideoSchema = new Schema(
  {
    quality: { type: String, enum: ['360', '480', '720', '1080'], required: true },
    videoKey: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: '', trim: true },
    minutes: { type: Number, required: true, min: 1, max: 600 },
    /** Exact length of the uploaded video in seconds (0 = not measured). */
    durationSec: { type: Number, default: 0, min: 0, max: 86400 },
    /** Free preview lesson — playable without purchase. */
    isPreview: { type: Boolean, default: false },
    /** Object key of the lesson video in the private B2 bucket. Empty = bundled demo clip. */
    videoKey: { type: String, default: '', trim: true, maxlength: 300 },
    /** Qualities (360/480/720/1080). `videoKey` mirrors the best one, for older app builds. */
    videos: { type: [lessonVideoSchema], default: [] },
    recipe: { type: recipeSchema },
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
    /** The course curriculum, in order. */
    lessons: { type: [lessonSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('lessonCount').get(function lessonCount() {
  return this.lessons.length;
});

courseSchema.virtual('totalMinutes').get(function totalMinutes() {
  return this.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
});

/*
 * Index strategy — the catalog is read-heavy, so every hot query should hit an index:
 *   - the public catalog filters on `published` and sorts by popularity/rating
 *   - admin filters by category and publish state
 *   - free-text search runs over title/promise/description ($text, weighted)
 */
courseSchema.index({ published: 1, isPopular: -1, rating: -1 });
courseSchema.index({ category: 1, published: 1 });
courseSchema.index(
  { title: 'text', promise: 'text', description: 'text' },
  { weights: { title: 5, promise: 2, description: 1 }, name: 'courseSearch' }
);

export const Course = mongoose.model('Course', courseSchema);

/**
 * One-time move for courses saved before sections were removed: their lessons are appended to the
 * flat `lessons` list (in section order) and the `sections` field is dropped. Safe to run on every boot.
 */
export async function flattenLegacySections() {
  const collection = mongoose.connection.db.collection('courses');
  const legacy = await collection.find({ sections: { $exists: true } }).toArray();
  for (const doc of legacy) {
    const fromSections = (doc.sections || []).flatMap((section) => section.lessons || []);
    const lessons = [...(doc.lessons || []), ...fromSections];
    await collection.updateOne({ _id: doc._id }, { $set: { lessons }, $unset: { sections: '' } });
  }
  if (legacy.length) console.log(`[db] moved lessons out of sections for ${legacy.length} course(s)`);
  return legacy.length;
}
