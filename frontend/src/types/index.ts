export interface Document {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  size_bytes?: number;
  type?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  document_count: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[] | null;
  documentsSearched?: number;
}

export interface Source {
  document_name: string;
  page_number: number;
  excerpt: string;
}

export interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AuthSession {
  user: User | null;
  loading: boolean;
}
