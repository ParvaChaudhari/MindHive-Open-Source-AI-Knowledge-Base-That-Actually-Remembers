import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const getHeaders = async (isMultipart = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
};

export const uploadDocument = async (file, collectionId = null) => {
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

export const listDocuments = async () => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDocument = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const queryDocument = async (id, question) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const summarizeDocument = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/summary`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteDocument = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, { 
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const renameDocument = async (id, name) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const ingestYoutube = async (url, collectionId = null) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/youtube`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, collection_id: collectionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const ingestWeb = async (url, collectionId = null) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/web`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, collection_id: collectionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const generateFlashcards = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/flashcards`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── Collections API ────────────────────────────────────────────────────────────

export const listCollections = async () => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createCollection = async (name, description = '') => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getCollection = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteCollection = async (id) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${id}`, { 
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const addDocumentToCollection = async (collectionId, documentId) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ document_id: documentId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const removeDocumentFromCollection = async (collectionId, docId) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/documents/${docId}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const queryCollection = async (collectionId, question) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const summarizeCollection = async (collectionId) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/collections/${collectionId}/summary`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getChatHistory = async (docId) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/documents/${docId}/chats`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const agentChat = async (message, history = []) => {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

