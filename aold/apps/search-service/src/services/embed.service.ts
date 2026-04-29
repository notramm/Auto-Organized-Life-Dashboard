// apps/search-service/src/services/embed.service.ts
import OpenAI  from 'openai';
import { config } from '../config';

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  return _client;
}

const embedCache = new Map<string, number[]>();

export async function embedQuery(query: string): Promise<number[]> {
  const key = query.toLowerCase().trim();
  if (embedCache.has(key)) return embedCache.get(key)!;

  const response = await getClient().embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: key,
  });
  const vector = response.data[0].embedding;
  if (embedCache.size >= 100) embedCache.delete(embedCache.keys().next().value!);
  embedCache.set(key, vector);
  return vector;
}

export async function extractQueryIntent(query: string): Promise<{
  cleanedQuery: string; fileTypeHint: string | null;
}> {
  const lower = query.toLowerCase();
  let fileTypeHint: string | null = null;
  if (/(photo|image|picture|pic|screenshot)/.test(lower))  fileTypeHint = 'IMAGE';
  if (/(video|clip|reel|recording|footage)/.test(lower))   fileTypeHint = 'VIDEO';
  if (/(doc|document|pdf|contract|report)/.test(lower))    fileTypeHint = 'DOCUMENT';

  const fillers = ['show me', 'find', 'search for', 'get', 'my', 'all', 'the'];
  let cleaned   = lower;
  for (const f of fillers) cleaned = cleaned.replace(new RegExp(`\\b${f}\\b`, 'g'), '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  return { cleanedQuery: cleaned || query, fileTypeHint };
}