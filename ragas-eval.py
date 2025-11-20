import csv
import json
import os
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_correctness,
    faithfulness,
    context_precision,
    context_recall,
    answer_similarity,
)

from tabulate import tabulate

os.environ["OPENAI_API_KEY"]= ""

# Load JSONL with error handling for invalid lines
data = []
with open("dataset-1.jsonl") as f:
    for idx, l in enumerate(f, 1):
        try:
            data.append(json.loads(l))
        except json.JSONDecodeError as e:
            print(f"Line {idx} in dataset-1.jsonl is not valid JSON: {e}")

dataset = Dataset.from_list(data)

# Run evaluation
try:
    result = evaluate(
        dataset=dataset,
        metrics=[
            answer_correctness,
            faithfulness,
            answer_similarity,
            context_precision,
            context_recall,
        ],
    )
    print(result)
except Exception as e:
    print(f"Evaluation failed: {e}")

table = [[k, v] for k, v in result.items()]

print(tabulate(table, headers=["Metric", "Value"], tablefmt="grid"))