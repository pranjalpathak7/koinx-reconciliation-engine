import fs from 'fs';
import { ReconciliationRun } from '../models/ReconciliationRun.js';
import { ReportEntry } from '../models/ReportEntry.js';
import { runReconciliationLogic } from '../services/matchingEngine.js';
import { ingestCsvFile } from '../services/ingestionService.js';
import { Parser } from 'json2csv';

/**
 * POST /reconcile
 * Triggers the reconciliation process by ingesting uploaded files and running the matching engine.
 */
export const triggerReconciliation = async (req, res) => {
  try {
    
    if (!req.files || !req.files.userFile || !req.files.exchangeFile) {
      return res.status(400).json({ error: 'Both userFile and exchangeFile are required.' });
    }

    const userFilePath = req.files.userFile[0].path;
    const exchangeFilePath = req.files.exchangeFile[0].path;

    // 2. Setup Configuration (Fallbacks to defaults if not provided in req.body)
    const config = {
      timestampToleranceSeconds: Number(req.body.timestampToleranceSeconds) || Number(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300,
      quantityTolerancePct: Number(req.body.quantityTolerancePct) || Number(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
    };

    // 3. Create a new Run record
    const run = await ReconciliationRun.create({
      status: 'PROCESSING',
      config,
    });

    // 4. Ingest the files into the database
    await ingestCsvFile(userFilePath, 'USER', run._id);
    await ingestCsvFile(exchangeFilePath, 'EXCHANGE', run._id);
    // 5. Run the Engine
    const summary = await runReconciliationLogic(run._id, config);

    res.status(200).json({
      message: 'Reconciliation completed successfully',
      runId: run._id,
      summary,
    });
  } catch (error) {
    console.error('Reconciliation failed:', error);
    res.status(500).json({ error: 'Reconciliation process failed', details: error.message });
  }
};

/**
 * GET /report/:runId/summary
 * Fetch just the counts
 */
export const getRunSummary = async (req, res) => {
  try {
    const run = await ReconciliationRun.findById(req.params.runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    res.status(200).json({ summary: run.summary, config: run.config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

/**
 * GET /report/:runId/unmatched
 * Fetch only unmatched rows with reasons
 */
export const getUnmatched = async (req, res) => {
  try {
    const unmatchedEntries = await ReportEntry.find({
      runId: req.params.runId,
      category: { $in: ['Unmatched (User only)', 'Unmatched (Exchange only)'] }
    }).select('category reason snapshot');

    res.status(200).json({ unmatched: unmatchedEntries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unmatched records' });
  }
};

/**
 * GET /report/:runId
 * Download the full reconciliation report as a CSV
 */
export const downloadFullReport = async (req, res) => {
  try {
    const entries = await ReportEntry.find({ runId: req.params.runId }).lean();
    
    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: 'No data found for this run' });
    }

    // Flatten the snapshot data for CSV export
    const csvData = entries.map(entry => ({
      Category: entry.category,
      Reason: entry.reason,
      'User Tx ID': entry.snapshot.userTxId,
      'Exchange Tx ID': entry.snapshot.exchangeTxId,
      'User Quantity': entry.snapshot.userQuantity,
      'Exchange Quantity': entry.snapshot.exchangeQuantity,
      'User Timestamp': entry.snapshot.userTimestamp,
      'Exchange Timestamp': entry.snapshot.exchangeTimestamp,
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`reconciliation_report_${req.params.runId}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate CSV report' });
  }
};