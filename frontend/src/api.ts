import { supabase } from './supabaseClient';
import { Document, Collection, Message, Source } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const getHeaders = async (isMultipart = false): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
};

export const uploadDocument = async (file: File, collectionId: string | null = null): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  if (collectionId) formData.append('collection_id', collectionId);
  
  const headers = await getHeaders(true);
  const res = await fetch(`${API_BASE}/documents/upload`, { 
    method: 'POST', 
    body: formData,
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const listDocuments = async (): Promise<{ documents: Document[] }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDocument = async (id: string): Promise<Document> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const queryDocument = async (id: string, question: string): Promise<{ answer: string; sources: Source[] }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const summarizeDocument = async (id: string): Promise<{ summary: string }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/summary`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteDocument = async (id: string): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, { 
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const renameDocument = async (id: string, name: string): Promise<Document> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const ingestYoutube = async (url: string, collectionId: string | null = null): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/youtube`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, collection_id: collectionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const ingestWeb = async (url: string, collectionId: string | null = null): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/web`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, collection_id: collectionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const generateFlashcards = async (id: string): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/flashcards`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── Collections API ────────────────────────────────────────────────────────────

export const listCollections = async (): Promise<{ collections: Collection[] }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createCollection = async (name: string, description: string = ''): Promise<Collection> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getCollection = async (id: string): Promise<Collection & { documents: Document[] }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteCollection = async (id: string): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${id}`, { 
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const addDocumentToCollection = async (collectionId: string, documentId: string): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const removeDocumentFromCollection = async (collectionId: string, docId: string): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/documents/${docId}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const queryCollection = async (collectionId: string, question: string): Promise<{ answer: string; sources: Source[]; documents_searched: number }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const summarizeCollection = async (collectionId: string): Promise<{ summary: string }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/summary`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getChatHistory = async (docId: string): Promise<{ chats: { question: string; answer: string }[] }> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${docId}/chats`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const agentChat = async (message: string, history: any[] = []): Promise<any> => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

