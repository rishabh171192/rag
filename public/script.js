const ingestForm = document.getElementById("ingest-form");
const ingestStatus = document.getElementById("ingest-status");
const queryForm = document.getElementById("query-form");
const answerOutput = document.getElementById("answer-output");
const answerStatus = document.getElementById("answer-status");

const setStatus = (node, message, type = "info") => {
  node.textContent = message;
  node.dataset.type = type;
};

if (ingestForm) {
  ingestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(ingestForm);
    if (!formData.get("file")) {
      setStatus(ingestStatus, "Please select a PDF first.", "error");
      return;
    }

    setStatus(ingestStatus, "Uploading...");

    try {
      const response = await fetch("/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      setStatus(ingestStatus, result.message || "Ingestion complete ✅");
      ingestForm.reset();
    } catch (err) {
      setStatus(ingestStatus, err.message, "error");
    }
  });
}

async function streamQueryResponse(response, onChunk) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error("Readable stream not available");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }
}

if (queryForm) {
  queryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    answerOutput.textContent = "";
    setStatus(answerStatus, "Thinking...");

    const payload = {
      bank_name: event.target.bank_name.value.trim(),
      query: event.target.query.value.trim(),
    };

    if (!payload.bank_name || !payload.query) {
      setStatus(answerStatus, "Bank name and question are required", "error");
      return;
    }

    try {
      const response = await fetch("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Query failed");
      }

      await streamQueryResponse(response, (chunk) => {
        answerOutput.textContent += chunk;
      });

      setStatus(answerStatus, "Done ✅");
    } catch (err) {
      setStatus(answerStatus, err.message, "error");
    }
  });
}

