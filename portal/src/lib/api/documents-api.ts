import api from "@/lib/api";
import type { DocumentDto } from "@/lib/api/applications-types";

type UploadDocumentPayload = Omit<DocumentDto, `uploader_id` | `application_id`> & {
  application_id?: string;
  uploader_id?: string;
};

type UploadDocumentResponse = {
  success?: boolean;
  data: UploadDocumentPayload;
};

export const uploadApplicationDocument = async ({
  applicationId,
  file,
  groupKey,
}: {
  applicationId: string;
  file: File;
  groupKey?: string | null;
}): Promise<DocumentDto> => {
  const formData = new FormData();
  formData.append(`file`, file);
  if (typeof groupKey === `string` && groupKey.trim().length > 0) {
    formData.append(`group_key`, groupKey.trim());
  }
  const res = await api.post<UploadDocumentResponse>(
    `/api/documents/${applicationId}`,
    formData,
  );
  const d = res.data.data;
  return {
    id: d.id,
    application_id: d.application_id ?? applicationId,
    group_key: d.group_key ?? null,
    version: d.version,
    is_current: d.is_current,
    file_path: d.file_path,
    original_name: d.original_name,
    mime_type: d.mime_type,
    size_bytes: d.size_bytes,
    uploader_id: d.uploader_id ?? ``,
  };
};
