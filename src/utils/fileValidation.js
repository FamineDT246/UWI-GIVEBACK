// Default limit set to 5MB to prevent database bloat
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Whitelist of strictly safe file types for evidence
export const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

/**
 * Validates a file before allowing it to be uploaded to Supabase.
 * * @param {File} file - The file object from the file input
 * @param {Array} allowedTypes - Array of allowed MIME types (defaults to images/pdf)
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export function validateFileUpload(file, allowedTypes = ALLOWED_EVIDENCE_TYPES, maxSize = MAX_FILE_SIZE_BYTES) {
  if (!file) {
    return { isValid: false, error: "No file was selected." };
  }

  // 1. Validate File Type (MIME Type Check)
  // This prevents uploading .exe, .sh, .js, or disguised scripts
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: "Invalid file type. Please upload a standard image (JPG/PNG/WEBP) or a PDF." 
    };
  }

  // 2. Validate File Size
  // Prevents massive payloads from stalling the server during a load test
  if (file.size > maxSize) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      isValid: false, 
      error: `File is too large (${sizeInMB}MB). The maximum allowed size is ${MAX_FILE_SIZE_MB}MB.` 
    };
  }

  // File passed all security checks
  return { isValid: true, error: null };
}