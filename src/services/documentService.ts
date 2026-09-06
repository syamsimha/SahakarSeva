import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AttachedDocument } from '../components/auth';
import { WorkerDocument } from '../types';

export const WORKER_DOCUMENTS_BUCKET = 'worker-documents';

/**
 * Sanitizes a file name for safe storage keys across cloud environments.
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Service to manage real worker document uploads, signed URL generation,
 * and verification metadata in Supabase.
 */
class DocumentService {
  /**
   * Uploads a worker verification document to the private Supabase Storage bucket.
   * Path convention: ${workerId}/${type}_${timestamp}_${sanitizedFileName}
   */
  async uploadWorkerDocument(
    workerId: string,
    doc: AttachedDocument,
    type: 'aadhaar' | 'skill_certificate'
  ): Promise<{ success: boolean; storagePath?: string; error?: string }> {
    if (!doc || !doc.uri) {
      return { success: false, error: 'Document URI is required.' };
    }

    if (!isSupabaseConfigured()) {
      // Offline/local fallback: store the local URI as the path
      return { success: true, storagePath: doc.uri };
    }

    try {
      const timestamp = Date.now();
      const cleanName = sanitizeFileName(doc.name || `${type}.pdf`);
      const storagePath = `${workerId}/${type}_${timestamp}_${cleanName}`;

      // Convert local URI (Web Blob or React Native file URI) to Blob
      const response = await fetch(doc.uri);
      const blob = await response.blob();

      const contentType =
        doc.mimeType ||
        (cleanName.endsWith('.pdf')
          ? 'application/pdf'
          : cleanName.endsWith('.png')
          ? 'image/png'
          : cleanName.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg');

      const { data, error } = await supabase.storage
        .from(WORKER_DOCUMENTS_BUCKET)
        .upload(storagePath, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn('[DocumentService.uploadWorkerDocument] Storage upload error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, storagePath: data?.path || storagePath };
    } catch (err: any) {
      console.warn('[DocumentService.uploadWorkerDocument] Exception during upload:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to upload document file.' };
    }
  }

  /**
   * Generates a time-limited signed URL (valid for 1 hour) for an Admin or Worker
   * to view a private verification document securely.
   */
  async getDocumentSignedUrl(fileUrlOrPath?: string | null): Promise<string | null> {
    if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') {
      return null;
    }

    const trimmed = fileUrlOrPath.trim();
    if (!trimmed) return null;

    // If already a signed URL or public URL with token
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('file:')) {
      return trimmed;
    }

    if (!isSupabaseConfigured()) {
      return trimmed;
    }

    try {
      // Strip potential full bucket prefix if stored redundantly
      let path = trimmed;
      if (path.startsWith(`${WORKER_DOCUMENTS_BUCKET}/`)) {
        path = path.replace(`${WORKER_DOCUMENTS_BUCKET}/`, '');
      }

      // If it's a full URL containing storage/v1/object, extract the relative path
      if (path.includes('/storage/v1/object/')) {
        const parts = path.split(`/storage/v1/object/${WORKER_DOCUMENTS_BUCKET}/`);
        if (parts.length > 1) {
          path = parts[1].split('?')[0];
        }
      }

      // Generate secure signed URL for 3600 seconds (1 hour)
      const { data, error } = await supabase.storage
        .from(WORKER_DOCUMENTS_BUCKET)
        .createSignedUrl(path, 3600);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      if (error) {
        console.warn('[DocumentService.getDocumentSignedUrl] createSignedUrl notice:', error.message);
      }

      // Fallback: if it was already a valid HTTP URL, return as-is
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }

      return null;
    } catch (err: any) {
      console.warn('[DocumentService.getDocumentSignedUrl] Exception:', err?.message || err);
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      return null;
    }
  }

  /**
   * Updates the audit status of an uploaded document in public.worker_documents.
   */
  async updateDocumentStatus(
    docId: string,
    status: 'uploaded' | 'verified' | 'rejected'
  ): Promise<boolean> {
    if (!docId) return false;

    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('worker_documents')
        .update({ status })
        .eq('id', docId);

      if (error) {
        console.warn('[DocumentService.updateDocumentStatus] Database error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[DocumentService.updateDocumentStatus] Exception:', err);
      return false;
    }
  }
}

export const documentService = new DocumentService();
