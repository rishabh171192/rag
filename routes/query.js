// routes/query.js
import express from "express";
import { qdrant } from "../services/qdrant.js";
import { embeddings, llm } from "../services/openai.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { query, bank_name } = req.body;
  if (!bank_name) {
    return res
      .status(400)
      .json({ success: false, error: "Bank name is required" });
  }
  const collectionName = `${bank_name}_docs`;
  try {
    // Best practices for RAG data fetching:

    // 1️⃣ Embed the query just once.
    const queryVector = await embeddings.embedQuery(query);
    // 3️⃣ Fetch with an appropriate 'limit' and add filters if possible (e.g., filtering by doc type, metadata, date).
    // You can try increasing the limit to retrieve more passages, then do better context selection (rerank or combine chunks).

    // 4️⃣ Fetch and sort by score (if available), and check if Qdrant supports filtering for more precise results.
    const searchResults = await qdrant.search(collectionName, {
      vector: queryVector, // or normalizedQueryVector
      limit: 8, // Fetch more for reranking/selecting best set
      // filter: { must: [ { key: "relevant_tag", match: { value: true } } ] }
    });

    // 5️⃣ (Optional, recommended!) Rerank results locally using a cross-encoder (e.g., OpenAI's search endpoint or Cohere rerank)
    //    This improves answer quality. You can call OpenAI embeddings or LLM to score each context against the query.

    // 6️⃣ Deduplicate similar chunks, consider grouping by document source, or merge overlapping spans for context.

    // 7️⃣ Use semantic sorting (by similarity score) and optionally threshold score for 'confidence' in below steps.

    // If you need just top N, you may truncate after reranking/deduplication.

    const context = searchResults.map((r) => r.payload.text).join("\n\n");

    // Always respond in **JSON format** with the following keys:
    // {
    //   "answer": "Concise, customer-friendly explanation.",
    //   "source": "Name of policy or document if available.",
    //   "confidence": "high | medium | low"
    // }
    const systemPrompt = `
    You are FinAI, a banking assistant. Use only the given context to answer.
    If unsure, respond: "I'm sorry, I couldn’t find that information in our current policy data."
    

    
    Context:
    ${context}
    `;

    // 4️⃣ Stream response
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const stream = await llm.stream([
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ]);

    for await (const chunk of stream) {
      const token = chunk?.content || "";
      res.write(token);
    }

    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
