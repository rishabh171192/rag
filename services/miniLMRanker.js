// services/miniLMRanker.js
import { pipeline } from "@xenova/transformers";

let miniLMModel = null;

export async function initMiniLMRanker() {
  console.log("Loading MiniLM Cross-Encoder (ms-marco-MiniLM-L-6-v2)...");

  miniLMModel = await pipeline(
    "feature-extraction",
    "Xenova/ms-marco-MiniLM-L-6-v2",
    {
      device: "auto",
    }
  );

  console.log("MiniLM Cross-Encoder loaded ✔");
}

export class MiniLMRanker {
  async rerank(query, passages) {
    if (!miniLMModel) {
      throw new Error(
        "MiniLM model not initialized. Call initMiniLMRanker() first."
      );
    }

    const results = [];

    console.log("Query", query);
    console.log("Passages", passages);

    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      // Fix: Provide input as a single string as required by model
      // This avoids passing an object with text/text_pair, which causes .split is not a function error
      // Instead, use the expected input pair: [query, passage]
      const output = await miniLMModel([query, passage]);

      // Extract scalar relevance score
      const score = output.data[0];

      results.push({ idx: i, score });
    }
    console.log(results);
    return results.sort((a, b) => b.score - a.score);
  }
}
