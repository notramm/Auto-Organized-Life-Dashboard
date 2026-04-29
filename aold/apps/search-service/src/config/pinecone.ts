// apps/search-service/src/config/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { config }   from './index';

let _pinecone: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!_pinecone) _pinecone = new Pinecone({ apiKey: config.PINECONE_API_KEY });
  return _pinecone;
}

export function getIndex() {
  return getPinecone().index(config.PINECONE_INDEX_NAME);
}