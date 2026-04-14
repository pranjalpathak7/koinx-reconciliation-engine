import { Transaction } from '../models/Transaction.js';
import { ReportEntry } from '../models/ReportEntry.js';
import { ReconciliationRun } from '../models/ReconciliationRun.js';
import { getEquivalentExchangeType, normalizeAsset } from '../utils/mappings.js';
import winston from 'winston';

export const runReconciliationLogic = async (runId, config) => {
  const { timestampToleranceSeconds, quantityTolerancePct } = config;
  const timeToleranceMs = timestampToleranceSeconds * 1000;
  const qtyToleranceDecimal = quantityTolerancePct / 100;

  // 1. Fetch all valid transactions
  const userTxs = await Transaction.find({ runId, source: 'USER', isValid: true }).lean();
  let exchangeTxs = await Transaction.find({ runId, source: 'EXCHANGE', isValid: true }).lean();
  
  const reportEntries = [];
  const summary = { matched: 0, conflicting: 0, unmatchedUser: 0, unmatchedExchange: 0 };

  // 2. Iterate through user transactions
  for (const userTx of userTxs) {
    const normalizedUserAsset = normalizeAsset(userTx.asset);
    const expectedExchangeType = getEquivalentExchangeType(userTx.type);

    // Find all exchange transactions that match the basic criteria (Asset + Type)
    const candidates = exchangeTxs.filter(exTx => 
      normalizeAsset(exTx.asset) === normalizedUserAsset &&
      exTx.type === expectedExchangeType
    );

    // Filter further by the Timestamp window
    const timeValidCandidates = candidates.filter(exTx => 
      Math.abs(exTx.parsedTimestamp - userTx.parsedTimestamp) <= timeToleranceMs
    );

    if (timeValidCandidates.length > 0) {
      // We have proximity matches. Now check Quantity tolerance.
      let matchedCandidate = null;
      let conflictingCandidate = null;

      for (const candidate of timeValidCandidates) {
        const qtyDiff = Math.abs(candidate.quantity - userTx.quantity);
        const maxAllowedDiff = userTx.quantity * qtyToleranceDecimal;

        if (qtyDiff <= maxAllowedDiff) {
          matchedCandidate = candidate;
          break; // Found a perfect match
        } else {
          conflictingCandidate = candidate; // Time matches, but quantity differs
        }
      }

      if (matchedCandidate) {
        // MATCHED
        reportEntries.push(createReportEntry(runId, 'Matched', 'Successfully paired within tolerances', userTx, matchedCandidate));
        summary.matched++;
        // Remove the matched transaction from the exchange pool so it isn't matched twice
        exchangeTxs = exchangeTxs.filter(tx => tx._id.toString() !== matchedCandidate._id.toString());
      } else if (conflictingCandidate) {
        // CONFLICTING
        reportEntries.push(createReportEntry(runId, 'Conflicting', 'Matched by time/type, but quantity differs beyond tolerance', userTx, conflictingCandidate));
        summary.conflicting++;
        exchangeTxs = exchangeTxs.filter(tx => tx._id.toString() !== conflictingCandidate._id.toString());
      }

    } else {
      // UNMATCHED (USER)
      reportEntries.push(createReportEntry(runId, 'Unmatched (User only)', 'No matching exchange transaction found within time window', userTx, null));
      summary.unmatchedUser++;
    }
  }

  // 3. Any exchange transactions left over are Unmatched (Exchange)
  for (const leftoverExTx of exchangeTxs) {
    reportEntries.push(createReportEntry(runId, 'Unmatched (Exchange only)', 'Present in exchange file, not found in user file', null, leftoverExTx));
    summary.unmatchedExchange++;
  }

  // 4. Bulk insert the report entries for high performance
  if (reportEntries.length > 0) {
    await ReportEntry.insertMany(reportEntries);
  }

  // 5. Update the Run document with the final summary
  await ReconciliationRun.findByIdAndUpdate(runId, {
    status: 'COMPLETED',
    summary
  });

  return summary;
};

/**
 * Helper to construct the ReportEntry object with a snapshot
 */
const createReportEntry = (runId, category, reason, userTx, exTx) => {
  return {
    runId,
    category,
    reason,
    userTransactionId: userTx ? userTx._id : null,
    exchangeTransactionId: exTx ? exTx._id : null,
    snapshot: {
      userTxId: userTx ? userTx.originalId : 'N/A',
      exchangeTxId: exTx ? exTx.originalId : 'N/A',
      userQuantity: userTx ? userTx.quantity : null,
      exchangeQuantity: exTx ? exTx.quantity : null,
      userTimestamp: userTx ? userTx.rawTimestamp : 'N/A',
      exchangeTimestamp: exTx ? exTx.rawTimestamp : 'N/A',
    }
  };
};