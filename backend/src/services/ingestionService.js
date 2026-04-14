import fs from 'fs';
import csv from 'csv-parser';
import { Transaction } from '../models/Transaction.js';
import { transactionRowSchema } from '../utils/validators.js';

/**
 * Parses a CSV file and loads the transactions into the database.
 * @param {string} filePath - Path to the uploaded CSV file
 * @param {string} source - 'USER' or 'EXCHANGE'
 * @returns {Promise<Object>} Statistics about the ingestion process
 */
export const ingestCsvFile = (filePath, source) => {
  return new Promise((resolve, reject) => {
    const transactions = [];
    let processedCount = 0;
    let errorCount = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        processedCount++;
        
        // 1. Validate the raw row using Zod
        const validation = transactionRowSchema.safeParse(row);
        
        let isValid = true;
        let validationErrors = [];
        let parsedTimestamp = null;

        if (!validation.success) {
          isValid = false;
          // Bulletproof error extraction: handle both 'issues' and 'errors' depending on the Zod version
          const errorList = validation.error?.issues || validation.error?.errors || [];
          validationErrors = errorList.map(err => err.message);
          
          if (validationErrors.length === 0) {
             validationErrors = ['Row failed validation schema'];
          }
          errorCount++;
        }

        // 2. Safely attempt to parse the timestamp for our matching engine
        if (row.timestamp && !isNaN(Date.parse(row.timestamp))) {
          parsedTimestamp = new Date(row.timestamp).getTime();
        }

        // 3. Construct the document
        transactions.push({
          source,
          originalId: row.transaction_id || `MISSING-ID-${processedCount}`,
          rawTimestamp: row.timestamp || '',
          parsedTimestamp,
          type: row.type ? row.type.toUpperCase() : 'UNKNOWN',
          asset: row.asset ? row.asset.toUpperCase() : 'UNKNOWN',
          quantity: parseFloat(row.quantity) || 0,
          priceUsd: parseFloat(row.price_usd) || 0,
          fee: parseFloat(row.fee) || 0,
          note: row.note || '',
          isValid,
          validationErrors,
        });
      })
      .on('end', async () => {
        try {
          // Bulk insert for high performance at scale
          if (transactions.length > 0) {
            await Transaction.insertMany(transactions);
          }
          
          // Clean up the uploaded file from the server
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          resolve({
            source,
            totalProcessed: processedCount,
            validRecords: processedCount - errorCount,
            invalidRecords: errorCount
          });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};