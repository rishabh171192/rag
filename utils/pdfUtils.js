// utils/pdfUtils.js
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { extractText } from "unpdf";

export async function extractAndChunkPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(buffer);

  const { text } = await extractText(uint8Array);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });

  const docs = await splitter.splitDocuments([
    new Document({ pageContent: text }),
  ]);

  return docs;
}
