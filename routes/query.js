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
    // 1️⃣ Embed the query
    const queryVector = await embeddings.embedQuery(query);
    const collectionName = `${bank_name}_docs`;
    // 2️⃣ Retrieve top docs
    const searchResults = await qdrant.search(collectionName, {
      vector: queryVector,
      limit: 5,
    });

    const context = searchResults.map((r) => r.payload.text).join("\n\n");

    const systemPrompt = `
    You are FinAI, a banking assistant. Use only the given context to answer.
    If unsure, respond: "I'm sorry, I couldn’t find that information in our current policy data."
    
    Always respond in **JSON format** with the following keys:
    {
      "answer": "Concise, customer-friendly explanation.",
      "source": "Name of policy or document if available.",
      "confidence": "high | medium | low"
    }
    
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
