# KoinX Transaction Reconciliation Engine

**Live Deployment:** https://koinx-reconciliation-engine.vercel.app/

A high-performance, full-stack application designed to ingest, validate, and reconcile cryptocurrency transaction reports between users and exchanges. Built with a Node.js/Express backend and a Next.js/Tailwind v4 frontend.

## Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas, Mongoose
* **Validation & Parsing:** Zod, `csv-parser` (Streaming), `multer`, `json2csv`
* **Frontend:** Next.js (App Router), Tailwind CSS v4, Lucide React
* **Code Quality:** ESLint, Husky (Conventional Commits)

---

## Zero-Config Setup Instructions

To provide the best evaluator experience, this project is designed to run locally **out of the box** without requiring you to set up your own `.env` files or database instances. A dedicated, read-only fallback database has been provided in the code specifically for this evaluation.

### Prerequisites
* Node.js (v18+ recommended)
* Git

### 1. Start the Backend
Open a terminal and run the following commands:

cd backend
npm install
npm run dev

*Note: The backend will automatically fall back to Port 5000 and connect to the evaluation MongoDB cluster if no `.env` file is present.*

### 2. Start the Frontend
Open a **second** terminal and run:

cd frontend
npm install
npm run dev

*Note: The frontend will automatically route API requests to `http://localhost:5000/api`. Navigate to `http://localhost:3000` in your browser to test the full UI.*

---

## Key Architectural Decisions & Edge Case Handling

The assignment contained several open-ended requirements. Below are the definitive engineering decisions made to handle edge cases, ensure scalability, and maintain data integrity.

### 1. Memory Safety via Streaming Ingestion
* **Challenge:** Loading massive CSV files (e.g., 1M+ rows) into memory using `fs.readFileSync` causes Node.js to crash (V8 memory limits).
* **Decision:** Implemented `csv-parser` with `fs.createReadStream`. The files are parsed chunk-by-chunk. Processed rows are batched and inserted into MongoDB using `insertMany()`, ensuring the engine scales linearly regardless of file size.

### 2. "Never Drop Bad Data" (Strict Validation)
* **Challenge:** Real-world CSVs have missing timestamps, negative quantities, or malformed strings. 
* **Decision:** Used **Zod** for strict row-by-row schema validation during ingestion. Instead of silently dropping bad rows, the engine saves them to the database with an `isValid: false` flag and populates a `validationErrors` array. This preserves a perfect audit trail of *why* a row was excluded from the matching pool.

### 3. Run Isolation (Concurrency Safety)
* **Challenge:** If multiple users trigger reconciliations simultaneously, or if one user runs it multiple times, the transaction data in the database will collide.
* **Decision:** Generated a unique `runId` for every reconciliation request. Every ingested transaction and report entry is strictly tied to this `runId`. The matching engine only queries data scoped to the active run, completely eliminating data pollution between executions.

### 4. Semantic Type & Asset Mapping
* **Challenge:** A user sending crypto to an exchange records a `TRANSFER_OUT`, while the exchange records that exact same event as a `TRANSFER_IN`. Furthermore, users might write `BITCOIN` while the exchange writes `BTC`.
* **Decision:** Built a robust mapping utility layer (`src/utils/mappings.js`). 
    * **Assets:** All tickers are dynamically normalized (e.g., `bitcoin` -> `BTC`, `tether` -> `USDT`).
    * **Types:** The engine explicitly maps inverse transaction types before comparing, ensuring a User `TRANSFER_OUT` successfully matches an Exchange `TRANSFER_IN`.

### 5. Snapshotting for Constant-Time Reporting
* **Challenge:** Generating the final CSV report by doing massive Mongoose `populate()` joins across thousands of matched `Transaction` documents is computationally expensive.
* **Decision:** When the engine finalizes a match, it writes a `ReportEntry` document containing a flattened `snapshot` object. This snapshot permanently stores the exact IDs, quantities, and timestamps. When `GET /report/:runId` is called, the database yields the pre-formatted data instantly, making CSV generation O(1) in complexity relative to table joins.

### 6. Dynamic Fallback Configuration
* **Challenge:** Engine tolerances (Timestamp and Quantity) needed to be configurable without code changes.
* **Decision:** Implemented a three-tier fallback hierarchy in the controller:
    1.  `req.body` (Allows real-time overrides via the Next.js UI)
    2.  `process.env` (Server-level deployment defaults)
    3.  Hardcoded integers (Ultimate safety net)

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/reconcile` | Accepts `userFile` & `exchangeFile` via `multipart/form-data`. Streams, parses, and executes the matching algorithm. Returns `runId`. |
| `GET` | `/api/report/:runId/summary` | Returns statistical counts: `matched`, `conflicting`, `unmatchedUser`, `unmatchedExchange`. |
| `GET` | `/api/report/:runId/unmatched` | Returns an array of specifically unmatched or conflicting records alongside the human-readable `reason` for failure. |
| `GET` | `/api/report/:runId` | Generates and downloads the full reconciliation audit report as a standard CSV file. |

---
**Author:** Pranjal Pathak