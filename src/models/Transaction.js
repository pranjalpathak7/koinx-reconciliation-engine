import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['USER', 'EXCHANGE'],
      required: true,
      index: true,
    },
    originalId: {
      type: String,
      required: true,
    },
    // Using String for the raw timestamp to preserve exact formatting for the final report
    rawTimestamp: {
      type: String,
      required: true,
    },
    // The parsed Unix epoch for efficient math/comparison during matching
    parsedTimestamp: {
      type: Number,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    asset: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    priceUsd: {
      type: Number,
    },
    fee: {
      type: Number,
    },
    note: {
      type: String,
      default: '',
    },
    // Data Quality Tracking
    isValid: {
      type: Boolean,
      default: true,
    },
    validationErrors: [{ type: String }],
  },
  { timestamps: true }
);

// Compound index to quickly fetch valid transactions for a specific source
transactionSchema.index({ source: 1, isValid: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);