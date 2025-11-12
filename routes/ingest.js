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
      const test = await embeddings.embedQuery(doc.pageContent);
      await qdrant.upsert(collectionName, {
        points: [
          {
            id: Date.now() + i,
            vector: test,
            payload: {
              text: doc.pageContent,
              source: req.file.originalname,
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
