import { CohereClientV2 } from "cohere-ai";
import dotenv from "dotenv";

dotenv.config();

export const cohere = new CohereClientV2({
  token: "O8NvjXwmfCIglRNgkumzGbsHLwUbrthmjNZbt6bI",
});
