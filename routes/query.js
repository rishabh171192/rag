// routes/query.js
import express from "express";
import { qdrant } from "../services/qdrant.js";
import { embeddings, llm } from "../services/openai.js";
import { cohere } from "../services/cohereReranker.js";
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

    // === Reranker Selection & Application ===
    // Use flag from request body: "reranker" possible values: "bge-base", "cohere-v3", "minilm", or null (default/none)
    // Each reranker is selected and invoked appropriately
    const { reranker = "cohere-v3" } = req.body;

    // Utility to prepare relevant reranker
    async function rerankWithBGEBase(query, results) {
      // Assume you have bgeReranker with .rerank(query, passages) -> [{ idx, score }]
      // This would typically call HuggingFace or an external service
      if (!global.bgeReranker) {
        throw new Error("BGE ReRanker not initialized"); // Placeholder
      }
      const passages = results.map((r) => r.payload.text);

      const scores = await global.bgeReranker.rerank(query, passages);
      // Merge scores back to results
      return scores
        .map((sc, i) => ({ ...results[i], rerank_score: sc.score }))
        .sort((a, b) => b.rerank_score - a.rerank_score);
    }

    async function rerankWithCohereV3(query, results) {
      // Assume you have cohereRerank with .rerank(query, passages) -> [{ idx, score }]
      const passages = results.map((r) => r.payload.text);

      const cohereResults = await cohere.rerank({
        query,
        documents: passages,
        topN: 5,
        model: "rerank-english-v3.0", // or multilingual model
      });
      // const cohereResults = await cohere.rerank(query, passages, {
      //   model: "rerank-english-v3.0",
      // });
      const output = cohereResults.results;
      // Each cohereResults[i] has .score; merge to results
      // Optional: filter or threshold based on score
      return output
        .map((co, i) => ({ ...results[i], rerank_score: co.score }))
        .sort((a, b) => b.rerank_score - a.rerank_score);
    }

    // Not a correct re ranked.. remove after POC
    async function rerankWithMiniLM(query, results) {
      // Assume you have miniLMRanker with .rerank(query, passages) -> [{ idx, score }]
      if (!global.miniLMRanker) {
        throw new Error("MiniLM Cross-Encoder not initialized");
      }
      const passages = results.map((r) => r.payload.text);
      const miniLMResults = await global.miniLMRanker.rerank(query, passages);
      return miniLMResults
        .map((ml, i) => ({ ...results[i], rerank_score: ml.score }))
        .sort((a, b) => b.rerank_score - a.rerank_score);
    }

    let rerankedResults = searchResults; // By default, no reranking
    if (reranker === "bge-base") {
      rerankedResults = await rerankWithBGEBase(query, searchResults);
      console.log(rerankedResults);
    } else if (reranker === "cohere-v3") {
      rerankedResults = await rerankWithCohereV3(query, searchResults);
    } else if (reranker === "minilm") {
      rerankedResults = await rerankWithMiniLM(query, searchResults);
    }

    // Use only top 6 (after rerank), safer context size:
    const context = rerankedResults
      .slice(0, 5)
      .map((r) => r.payload.text)
      .join("\n\n");

    const systemPrompt = `
    You are FinAI, a banking assistant. Use only the given context to answer.
    If unsure, respond: "I'm sorry, I couldn’t find that information in our current policy data."
    

    
    Context:
    ${context}
    `;

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
