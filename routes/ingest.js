import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { qdrant } from "../services/qdrant.js";
import { embeddings } from "../services/openai.js";
import { extractAndChunkPDF } from "../utils/pdfUtils.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // local uploads folder

// POST /ingest (multipart)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const { bank_name } = req.body;
    if (!bank_name) {
      return res
        .status(400)
        .json({ success: false, error: "Bank name is required" });
    }

    console.log(`📄 Received PDF: ${req.file.originalname}`);

    const docs = await extractAndChunkPDF(filePath);
    const collectionName = `${bank_name}_docs`;
    // Create collection if missing
    try {
      await qdrant.createCollection(collectionName, {
        vectors: { size: 1536, distance: "Cosine" },
      });
    } catch (err) {
      console.log("Collection may already exist:", err.message);
    }

    // Upload to Qdrant
    for (const [i, doc] of docs.entries()) {
      const vector = await embeddings.embedQuery(doc.pageContent);
      // Additional useful metadata for RAG:
      // - totalPages: total number of pages in the PDF (if available)
      // - chunk_size: length of the text chunk
      // - file_type: to indicate it's a PDF
      // - ingestion_id: unique session/batch ID for uploaded file
      // - original_upload_name: original filename (redundant with 'source', but more explicit if needed)
      // - ingest_user: (if available in context/auth, not here)
      // - ingest_time: duplicate with uploaded_at
      // - doc_id: perhaps a UUID per document/chunk

      // Example rewrite with some of these extras:
      await qdrant.upsert(collectionName, {
        points: [
          {
            id: Date.now(),
            vector,
            payload: {
              text: doc.pageContent,
              source: req.file.originalname,
              bank: bank_name,
              page: doc.metadata?.page,
              totalPages: doc.metadata?.totalPages,
              chunk: i,
              chunk_size: doc.pageContent.length,
              file_type: "pdf",
              original_upload_name: req.file.originalname,
              uploaded_at: new Date().toISOString(),
            },
          },
        ],
      });
    }

    // Remove temp file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: "✅ PDF ingested successfully" });
  } catch (err) {
    console.error("Ingest Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
