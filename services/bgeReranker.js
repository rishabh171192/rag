// services/bgeReranker.js
import { pipeline } from "@xenova/transformers";

let bgeModel = null;

export async function initBGEReranker() {
  console.log("Loading BGE Reranker model (BAAI/bge-reranker-base)...");

  bgeModel = await pipeline("feature-extraction", "Xenova/bge-reranker-base", {
    device: "auto",
  });

  console.log("BGE Reranker loaded ✔");
}

export class BGEReranker {
  async rerank(query, passages) {
    if (!bgeModel) {
      throw new Error(
        "BGE Model not initialized. Call initBGEReranker() first."
      );
    }

    const results = [];

    console.log("Query", query);
    console.log("Passages", passages);

    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i];

      // Cross encoder expects: [query, passage]
      const output = await bgeModel([query, passage]);

      // Extract scalar relevance score
      const score = output.data[0];

      results.push({ idx: i, score });
    }

    console.log(results);

    // Sort highest score first
    return results.sort((a, b) => b.score - a.score);
  }
}
