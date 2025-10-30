// REST API client for document upload endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Document {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  space_id: string;
  uploaded_by: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  extracted_text?: string;
  metadata?: Record<string, any>;
  processed_at?: string;
  processing_error?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentRequest {
  file: File;
  space_id: string;
  name?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

// Helper function for making authenticated API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// Document API functions
export const documentsApi = {
  // Upload a document
  upload: async (
    request: UploadDocumentRequest,
    accessToken: string,
    onProgress?: (progress: number) => void
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('space_id', request.space_id);
    if (request.name) {
      formData.append('name', request.name);
    }

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(
              new Error(errorData.detail || `Upload failed: ${xhr.statusText}`)
            );
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Open and send request
      xhr.open('POST', `${API_BASE_URL}/api/documents`);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
  },

  // List documents (optionally filtered by space)
  list: async (
    accessToken: string,
    spaceId?: string
  ): Promise<DocumentListResponse> => {
    const endpoint = spaceId
      ? `/api/documents?space_id=${spaceId}`
      : '/api/documents';
    return apiRequest<DocumentListResponse>(
      endpoint,
      { method: 'GET' },
      accessToken
    );
  },

  // Get document by ID
  get: async (documentId: string, accessToken: string): Promise<Document> => {
    return apiRequest<Document>(
      `/api/documents/${documentId}`,
      { method: 'GET' },
      accessToken
    );
  },

  // Delete document
  delete: async (
    documentId: string,
    accessToken: string
  ): Promise<{ message: string; id: string }> => {
    return apiRequest<{ message: string; id: string }>(
      `/api/documents/${documentId}`,
      { method: 'DELETE' },
      accessToken
    );
  },

  // Download document
  download: async (documentId: string, accessToken: string): Promise<Blob> => {
    const url = `${API_BASE_URL}/api/documents/${documentId}/download`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.blob();
  },
};
