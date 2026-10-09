import { Router } from 'express';
import { getSettings } from '../controllers/admin/settings.controller.js';

const router = Router();

/** Public copy of the app settings — the mobile app reads this at startup. */
router.get('/', getSettings);

export default router;
