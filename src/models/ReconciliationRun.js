import mongoose from 'mongoose';

const reconciliationRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    // Store the config used for THIS specific run for historical accuracy
    config: {
      timestampToleranceSeconds: { type: Number, required: true },
      quantityTolerancePct: { type: Number, required: true },
    },
    summary: {
      matched: { type: Number, default: 0 },
      conflicting: { type: Number, default: 0 },
      unmatchedUser: { type: Number, default: 0 },
      unmatchedExchange: { type: Number, default: 0 },
    },
    errorLog: {
      type: String,
    },
  },
  { timestamps: true }
);

export const ReconciliationRun = mongoose.model('ReconciliationRun', reconciliationRunSchema);