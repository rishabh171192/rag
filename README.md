Setup Steps

1. Clone the repo
2. Set Node Version to v20.19 (Better to use NVM)
3. Run npm install
4. Copy .env.sample as .env and add secrets
5. Run - node index.js

Curl
Ingestion:

1. File path in form data body
2. Bank Name (Bank name for which you want to ingest data)
   curl --location 'http://localhost:3000/ingest' \
   --form 'file=@"/Users/rishabh/Downloads/family-banking-tnc.pdf"' \
   --form 'bank_name="icici"'

Search Data:

1. Query or Search term
2. Bank Name (Bank name for which you want to search data)

curl --location 'http://localhost:3000/query' \
--header 'Content-Type: application/json' \
--data '{
"query": "tech",
"bank_name": "icici"
} '
