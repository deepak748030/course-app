import { Category } from '../../models/Category.js';
import { Course } from '../../models/Course.js';
import { emitToApp } from '../../realtime/socket.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** GET /api/admin/categories — with per-category course counts. */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, label: 1 }).lean();
  const counts = await Course.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({
    categories: categories.map((category) => ({
      ...category,
      courseCount: countById.get(String(category._id)) || 0,
    })),
  });
});

/** POST /api/admin/categories */
export const createCategory = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.slug) {
    body.slug = body.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  const category = await Category.create(body);
  emitToApp('catalog.changed', { reason: 'category-created' });
  res.status(201).json({ category });
});

/** PUT /api/admin/categories/:id */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new HttpError(404, 'Category not found');
  emitToApp('catalog.changed', { reason: 'category-updated' });
  res.json({ category });
});

/** DELETE /api/admin/categories/:id — blocked while courses still reference it. */
export const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Course.countDocuments({ category: req.params.id });
  if (inUse > 0) {
    throw new HttpError(409, `${inUse} course(s) still use this category — move them first`);
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  emitToApp('catalog.changed', { reason: 'category-deleted' });
  res.json({ ok: true, deleted: category.label });
});
