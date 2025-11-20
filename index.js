// server.js
import express from "express";
import dotenv from "dotenv";
import ingestRoute from "./routes/ingest.js";
import queryRoute from "./routes/query.js";

import { initBGEReranker, BGEReranker } from "./services/bgeReranker.js";
import { initMiniLMRanker, MiniLMRanker } from "./services/miniLMRanker.js";
// import {
//   initCohereReranker,
//   CohereReranker,
// } from "./services/cohereReranker.js";

import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use("/ingest", ingestRoute);
app.use("/query", queryRoute);

await initBGEReranker();
await initMiniLMRanker();
// await initCohereReranker();

global.bgeReranker = new BGEReranker();
global.miniLMRanker = new MiniLMRanker();
// global.cohereReranker = new CohereReranker();

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});
