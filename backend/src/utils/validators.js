import { z } from 'zod';

// We validate everything as strings first since that's how CSVs are parsed, 
// then use refinements to check if they can be safely converted to numbers/dates.
export const transactionRowSchema = z.object({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  timestamp: z.string().refine((ts) => !isNaN(Date.parse(ts)), {
    message: "Invalid or missing timestamp format",
  }),
  type: z.string().min(1, "Transaction type is required"),
  asset: z.string().min(1, "Asset symbol is required"),
  quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Quantity must be a valid positive number",
  }),
  price_usd: z.string().optional(),
  fee: z.string().optional(),
  note: z.string().optional(),
});