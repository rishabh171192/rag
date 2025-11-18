// utils/pdfUtils.js
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

import { createRequire } from "module";
import { extractText } from "unpdf";

/**
 * pdf: Basic PDF text extractor (all text, not structured)
 */
export async function pdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Custom separators for text chunking (including cues for tables)
 */
const separators = [
  "\nSECTION ",
  "\nARTICLE ",
  "\nCHAPTER ",
  "\nPART ",
  "\nSCHEDULE ",
  "\nAPPENDIX ",
  "12 CFR ",
  "REG ",
  "FDIC",
  "OCC",
  "CFPB",
  "RBI",
  "SEBI",
  "IRDAI",
  "CHECKING ACCOUNT",
  "SAVINGS ACCOUNT",
  "CURRENT ACCOUNT",
  "CREDIT CARD",
  "LOAN AGREEMENT",
  "FEE SCHEDULE",
  "INTEREST RATES",
  "TERMS AND CONDITIONS",
  "PRIVACY NOTICE",
  "DEFINITIONS",
  "DISCLOSURE",
  ",", // CSV/table row
  "  ", // multi-space (tables)
  ":", // key-value tables
  "\n\n",
  "\n",
  " ",
  "",
];

/**
 * Attempts to preserve table formatting using Markdown, if possible.
 * Converts detected tabular structures into Markdown tables.
 */
export function preserveTables(text) {
  // Detect simple CSV style tables: 2+ lines with commas, and similar length
  const lines = text.split("\n");
  let output = [];
  let insideTable = false;
  let tableBlock = [];

  function linesAreTabular(block) {
    if (block.length < 2) return false;
    const cols = block[0].split(",").length;
    return block.every((l) => l.split(",").length === cols && cols > 1);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Start or continue a table block
    if (line.includes(",") && line.trim().length > 3) {
      tableBlock.push(line);
      insideTable = true;
    } else {
      if (
        insideTable &&
        tableBlock.length >= 2 &&
        linesAreTabular(tableBlock)
      ) {
        // Convert block to markdown table & reset
        const headers = tableBlock[0]
          .split(",")
          .map((h) => h.trim())
          .join(" | ");
        const sep = headers
          .split("|")
          .map(() => "---")
          .join("|");
        output.push(
          headers,
          sep,
          ...tableBlock.slice(1).map((row) =>
            row
              .split(",")
              .map((cell) => cell.trim())
              .join(" | ")
          )
        );
      } else if (tableBlock.length > 0) {
        // Just dump block (not a table)
        output.push(...tableBlock);
      }
      tableBlock = [];
      insideTable = false;
      output.push(line);
    }
  }
  // Flush last table
  if (tableBlock.length >= 2 && linesAreTabular(tableBlock)) {
    const headers = tableBlock[0]
      .split(",")
      .map((h) => h.trim())
      .join(" | ");
    const sep = headers
      .split("|")
      .map(() => "---")
      .join("|");
    output.push(
      headers,
      sep,
      ...tableBlock.slice(1).map((row) =>
        row
          .split(",")
          .map((cell) => cell.trim())
          .join(" | ")
      )
    );
  } else if (tableBlock.length > 0) {
    output.push(...tableBlock);
  }
  return output.join("\n");
}

/**
 * Cleans PDF OCR output, but also tries to preserve table formatting by adding Markdown for tables.
 */
export function cleanUnpdfOutput(text) {
  // Clean up text, fix wordbreaks, bullets etc.
  let cleaned = text
    .replace(/(\S)\n(\S)/g, "$1 $2")
    .replace(/[ ]{3,}/g, "  ")
    .replace(/[•▪◦●]/g, "- ")
    .replace(/Page\s+\d+(\s+of\s+\d+)?/gi, "")
    .replace(/(Confidential|Proprietary|Draft)/gi, "");

  // Try to preserve table formatting (CSV/columns to Markdown table)
  cleaned = preserveTables(cleaned);

  return cleaned;
}

/**
 * Enhanced function to extract and chunk PDF,
 * preserving page numbers, collecting metadata,
 * and attempting to preserve table formatting for downstream delivery.
 */
export async function extractAndChunkPDF(filePath) {
  // Read and convert the PDF buffer
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);

  // Extract per-page text from unpdf
  const { text: pages } = await extractText(uint8Array, { layout: true });

  // Collect per-page content with page numbers for chunking
  let allDocs = [];
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 850,
    chunkOverlap: 150,
    separators,
  });

  for (let i = 0; i < pages.length; i++) {
    // Clean and preserve tables for each page
    const text = cleanUnpdfOutput(pages[i] ?? "");
    // Each page as a Document with metadata
    const pageDoc = new Document({
      pageContent: text,
      metadata: { page: i + 1, totalPages: pages.length },
    });

    // Chunk per page
    const pageChunks = await splitter.splitDocuments([pageDoc]);
    // Add page number to each chunk's metadata
    pageChunks.forEach((chunk) => {
      if (!chunk.metadata) chunk.metadata = {};
      chunk.metadata.page = i + 1;
    });
    allDocs.push(...pageChunks);
  }

  // Add totalPages to each chunk
  allDocs.forEach((chunk) => {
    chunk.metadata.totalPages = pages.length;
  });

  return allDocs;
}

/**
 * Legacy version, used for context/ref only.
 */
export async function extractAndChunkPDFOld(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(buffer);

  const { text } = await extractText(uint8Array);

  const cleanedText = cleanUnpdfOutput(text.join("\n\n"));
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 850,
    chunkOverlap: 150,
    separators,
  });

  const docs = await splitter.splitDocuments([
    new Document({ pageContent: cleanedText }),
  ]);

  return docs;
}
