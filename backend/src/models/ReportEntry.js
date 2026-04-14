import mongoose from 'mongoose';

const reportEntrySchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReconciliationRun',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'Matched',
        'Conflicting',
        'Unmatched (User only)',
        'Unmatched (Exchange only)',
      ],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    // References to the original transactions
    userTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    exchangeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    // Storing snapshots of key data prevents massive JOINs (populates) when exporting the CSV
    snapshot: {
      userTxId: String,
      exchangeTxId: String,
      userQuantity: Number,
      exchangeQuantity: Number,
      userTimestamp: String,
      exchangeTimestamp: String,
    },
  },
  { timestamps: true }
);

export const ReportEntry = mongoose.model('ReportEntry', reportEntrySchema);