// services/openai.js
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",  
});

export const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  streaming: true,
});
