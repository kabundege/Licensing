import type { Document } from './entities/document.entity';

export const documentPublicShape = (doc: Document) => ({
  id: doc.id,
  application_id: doc.application_id,
  group_key: doc.group_key,
  version: doc.version,
  is_current: doc.is_current,
  file_path: doc.file_path,
  original_name: doc.original_name,
  mime_type: doc.mime_type,
  size_bytes: doc.size_bytes,
  uploader_id: doc.uploader_id,
});
