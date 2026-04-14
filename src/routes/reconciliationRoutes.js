import express from 'express';
import { uploadCsv } from '../middlewares/uploadMiddleware.js'; // Import Multer
import {
  triggerReconciliation,
  downloadFullReport,
  getRunSummary,
  getUnmatched
} from '../controllers/reconciliationController.js';

const router = express.Router();

// Add the middleware here to accept two specific file fields
router.post(
  '/reconcile', 
  uploadCsv.fields([{ name: 'userFile', maxCount: 1 }, { name: 'exchangeFile', maxCount: 1 }]), 
  triggerReconciliation
); 

router.get('/report/:runId', downloadFullReport);
router.get('/report/:runId/summary', getRunSummary);
router.get('/report/:runId/unmatched', getUnmatched);

export default router;