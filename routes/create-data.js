import { qdrant } from "../services/qdrant.js";
import { embeddings, llm } from "../services/openai.js";
import { cohere } from "../services/cohereReranker.js";
import fs from "fs";

const data = [
  {
    context:
      "Services include Cash Payment, Cash Deposit, DD/PO Delivery, Instrument Pick up.",
    question: "What services are offered under ICICI Bank@Home?",
    ground_truth:
      "Cash payment, cash deposit, DD/PO delivery, and instrument pickup.",
  },
  {
    context: "Customer must be at least 18 years of age.",
    question: "What is the minimum age required to use Bank@Home services?",
    ground_truth: "18 years.",
  },
  {
    context: "Cash withdrawal per request between Rs. 2,000 to Rs. 2,00,000.",
    question:
      "What is the transaction limit for cash withdrawal through Bank@Home?",
    ground_truth: "Between ₹2,000 and ₹2,00,000 per request.",
  },
  {
    context: "DD Delivery per request between Rs. 2,000 to Rs. 2,00,000.",
    question: "What is the transaction limit for DD/PO delivery?",
    ground_truth: "Between ₹2,000 and ₹2,00,000 per request.",
  },
  {
    context: "Rs 50 + applicable taxes per visit.",
    question: "What are the charges per visit for Bank@Home?",
    ground_truth: "₹50 plus applicable taxes.",
  },
  {
    context: "Instrument Pickup: No Limit.",
    question: "Does instrument pickup have a transaction limit?",
    ground_truth: "No.",
  },
  {
    context:
      "Application may be made through 24-Hour Customer Care, Infinity, any branch, or other modes.",
    question: "Through which channels can customers apply for Bank@Home?",
    ground_truth:
      "Through 24-Hour Customer Care, Infinity Internet Banking, ICICI branches, or other approved channels.",
  },
  {
    context:
      "Services shall be activated after a minimum of one working day for applications via Infinity.",
    question:
      "How long after applying through Infinity does service activation take?",
    ground_truth: "A minimum of one working day.",
  },
  {
    context: "Customer can avail services immediately at branches.",
    question: "Can applications submitted at a branch be used immediately?",
    ground_truth: "Yes, customers can avail services immediately at branches.",
  },
  {
    context:
      "Customer shall provide an ICICI Bank cheque number and hand over a cancelled cheque.",
    question:
      "What must a customer provide for cash payment instructions via phone banking?",
    ground_truth: "An ICICI Bank cheque number and a cancelled cheque.",
  },
  // {
  //   context:
  //     "Customer shall hand over the Cancelled Cheque or Acknowledgement Form.",
  //   question: "What must customers hand over for DD/PO delivery?",
  //   ground_truth: "A cancelled cheque or acknowledgement form.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall not be required to independently verify the veracity or authenticity of the Instructions.",
  //   question: "Is ICICI Bank required to verify instruction authenticity?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall be responsible for the acts of omission or commission of the Agents.",
  //   question: "Who is responsible for the actions of Bank@Home service agents?",
  //   ground_truth: "ICICI Bank is responsible.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall not be responsible for delay due to failure of operational systems.",
  //   question: "Is ICICI Bank liable for delays caused by system failures?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "No cut/soiled/mutilated/tampered/defective currency notes shall be accepted.",
  //   question:
  //     "What must the customer do if currency notes are tampered or defective?",
  //   ground_truth:
  //     "Such notes must not be provided; they will be returned by the agent.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall not be held liable for not crediting the value of defective/discrepant/counterfeit notes.",
  //   question:
  //     "Does ICICI Bank accept liability for counterfeit notes handed over by the customer?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "Available between 9:00 am to 5:00 pm on every working day.",
  //   question: "What time window is the Bank@Home service available?",
  //   ground_truth: "9:00 AM to 5:00 PM on ICICI working days.",
  // },
  // {
  //   context: "Services shall not be available on ICICI Bank Holidays.",
  //   question: "Are services available on ICICI Bank Holidays?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "Customer must provide Instructions minimum two hours prior to the requested time.",
  //   question: "Can customers request service for the same working day?",
  //   ground_truth: "Yes, with a minimum gap of 2 hours before the requested time.",
  // },
  // {
  //   context:
  //     "Customer shall verify the Agent’s identity and Service Request Number.",
  //   question: "How must a customer verify an agent's identity?",
  //   ground_truth:
  //     "By checking the agent's identification card and service request number.",
  // },
  // {
  //   context:
  //     "Instruments would be credited in the next clearing cycle subject to realization.",
  //   question: "When is instrument pickup credited?",
  //   ground_truth: "In the next clearing cycle, subject to realization.",
  // },
  // {
  //   context:
  //     "ICICI Bank may suspend the Services without prior notice for emergencies or security reasons.",
  //   question: "Can ICICI Bank suspend services without notice?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "Customer shall cancel the earlier Instruction before providing a fresh Instruction.",
  //   question: "Can customers modify a previous instruction through Infinity?",
  //   ground_truth: "Yes, but only after cancelling the earlier instruction.",
  // },
  // {
  //   context:
  //     "ICICI Bank may refuse to comply with Instructions without assigning any reason.",
  //   question: "Can ICICI Bank refuse instructions?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "Transmission may be subject to tampering, unauthorized access, or not received in whole.",
  //   question:
  //     "Does ICICI Bank guarantee receipt of instructions sent via phone/internet?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "Any legal action or proceedings shall be brought in the courts or tribunals at Mumbai.",
  //   question: "Where will legal disputes be handled?",
  //   ground_truth: "In courts or tribunals at Mumbai.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall have the right to transfer, assign or sell all its rights.",
  //   question: "Can ICICI Bank transfer its rights under the terms?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context: "Services provided to the Customer are not transferable.",
  //   question: "Can customers transfer Bank@Home services?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "If authentication procedure may be known by an unauthorized person, Customer must notify ICICI Bank immediately.",
  //   question:
  //     "What happens if an unauthorized person learns the customer’s authentication information?",
  //   ground_truth: "Customer must notify ICICI Bank immediately.",
  // },
  // {
  //   context: "Amended Terms shall be communicated by hosting on Infinity.",
  //   question: "Will ICICI Bank notify customers of changes to the terms?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "Customer shall scrutinize the envelope for any signs of tampering.",
  //   question:
  //     "Is the envelope containing cash payment checked for tampering by the customer?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context: "Customer shall check the monies in front of the Agent.",
  //   question: "Must customers count money delivered by the agent?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "Customer can request service for the same or the next working day.",
  //   question: "Can customers request services for the next working day?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context: "Agent shall provide the Customer with a cash deposit envelope.",
  //   question: "Who provides the cash deposit envelope?",
  //   ground_truth: "The agent.",
  // },
  // {
  //   context:
  //     "ICICI Bank may withdraw or terminate the Services at any time without prior notice.",
  //   question:
  //     "Under what condition can ICICI Bank terminate services permanently?",
  //   ground_truth: "At its discretion.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall not be liable for any direct, indirect, incidental, special or consequential damages including loss of profits.",
  //   question:
  //     "Is ICICI Bank liable for business interruption or loss of profits?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "Stop payment instructions shall be deemed to have been provided for the Cancelled Cheque.",
  //   question:
  //     "Are stop-payment instructions automatically applied to cancelled cheques?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "ICICI Bank may contact the Customer through phone, email, letter or otherwise.",
  //   question:
  //     "Can ICICI Bank contact customers via phone or email for processing instructions?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context:
  //     "Infinity instructions require one working day after application receipt.",
  //   question:
  //     "If a customer submits an application at a branch and immediately tries to give instructions through Infinity, will it work?",
  //   ground_truth: "No.",
  // },
  // {
  //   context:
  //     "ICICI Bank shall not be liable if Customer does not undertake the verification steps.",
  //   question:
  //     "If a customer hands over money for deposit without verifying the agent's identity, is ICICI Bank liable?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "ICICI Bank shall deduct counterfeit notes.",
  //   question:
  //     "If a counterfeit note is found in the deposit, how much is credited?",
  //   ground_truth: "Only genuine notes.",
  // },
  // {
  //   context: "Minimum limit is Rs. 2,000.",
  //   question: "Can a customer request a cash delivery for ₹500?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "ICICI Bank not liable for transmission errors.",
  //   question:
  //     "Who is responsible for incorrect instructions caused by transmission errors?",
  //   ground_truth: "The customer.",
  // },
  // {
  //   context: "ICICI Bank determines fees.",
  //   question: "Can customers negotiate service charges?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "Executed on next working day.",
  //   question: "When are instructions submitted on a non-working day executed?",
  //   ground_truth: "Next working day.",
  // },
  // {
  //   context: "Customer shall not provide stale or defective instruments.",
  //   question: "Are stale or defective instruments accepted for pickup?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "Customer shall sign across the sealed portion.",
  //   question:
  //     "Must customers sign across the sealed portion of deposit envelopes?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context: "Customer must hand over monies back if discrepancy exists.",
  //   question: "If cash envelope appears torn, what must the customer do?",
  //   ground_truth: "Return all money to the agent.",
  // },
  // {
  //   context: "Only same or next working day allowed.",
  //   question: "Can customers request services two days in advance?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "Bank has no obligation to maintain records.",
  //   question: "Is ICICI Bank required to keep records of instructions?",
  //   ground_truth: "No.",
  // },
  // {
  //   context: "Services provided only at communication address with ICICI Bank.",
  //   question: "Are services provided only at registered communication address?",
  //   ground_truth: "Yes.",
  // },
  // {
  //   context: "Failure to pay fees may lead to interest or service withdrawal.",
  //   question: "What happens if customer fails to pay service fees?",
  //   ground_truth: "Interest may be charged or services withdrawn.",
  // },
];

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
    .map((co, i) => ({ ...results[i], rerank_score: co.relevanceScore }))
    .sort((a, b) => b.rerank_score - a.rerank_score);
}

async function setupDataset() {
  const final_data_set = [];
  for (let info of data) {
    const collectionName = `icici_docs`;
    const query = info.question;

    const queryVector = await embeddings.embedQuery(query);

    const searchResults = await qdrant.search(collectionName, {
      vector: queryVector, // or normalizedQueryVector
      limit: 8, // Fetch more for reranking/selecting best set
      // filter: { must: [ { key: "relevant_tag", match: { value: true } } ] }
    });

    // reranker = "cohere-v3";

    let rerankedResults = searchResults;
    rerankedResults = await rerankWithCohereV3(query, searchResults);
    const contextData = rerankedResults.map((info) => info.payload.text);
    const context = rerankedResults
      .slice(0, 5)
      .map((r) => r.payload.text)
      .join("\n\n");

    const systemPrompt = `
      You are FinAI — a banking policy assistant.
      
      Answer using ONLY the provided context.
      
      HARD RULES:
      1. Use ONLY facts from the context.
      2. No assumptions, interpretations, or outside knowledge.
      3. Stick exactly to the intent of the text.
      4. No examples or hypotheticals.
      5. Provide only what exists in the context.
      6. If information is missing, respond exactly:
         "I'm sorry, I couldn't find that information in our current policy data."
      
      RESPONSE STYLE:
      - Short, precise, factual.
      - No filler, no repeating the question.
      `;

    const userPrompt = `Context:
      ${context}

      Question:
      ${query}`;

    const stream = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    final_data_set.push({
      question: info.question,
      answer: stream.content,
      ground_truth: info.ground_truth,
      contexts: contextData,
    });
  }

  const jsonl = final_data_set.map((obj) => JSON.stringify(obj)).join("\n");
  fs.writeFileSync("dataset-1.jsonl", jsonl, "utf-8");
  console.log("dataset.jsonl created successfully");
}

setupDataset();
