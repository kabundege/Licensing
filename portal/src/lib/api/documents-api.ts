import api from "@/lib/api";
import type { DocumentDto } from "@/lib/api/applications-types";

const parseDownloadFilename = (
  contentDisposition: string | undefined,
  fallback: string,
): string => {
  if (!contentDisposition || typeof contentDisposition !== `string`) {
    return fallback;
  }
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf?.[1]) {
    const raw = utf[1].trim().replaceAll(`"`, ``);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw || fallback;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }
  const plain = /filename=([^;]+)/i.exec(contentDisposition);
  if (plain?.[1]) {
    return plain[1].trim().replaceAll(`"`, ``);
  }
  return fallback;
};

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

export const downloadApplicationDocument = async ({
  documentId,
  suggestedName,
}: {
  documentId: string;
  suggestedName: string;
}): Promise<void> => {
  const res = await api.get<Blob>(`/api/documents/${documentId}/download`, {
    responseType: `blob`,
  });
  const cd =
    typeof res.headers[`content-disposition`] === `string`
      ? res.headers[`content-disposition`]
      : undefined;
  const filename = parseDownloadFilename(cd, suggestedName);
  const url = URL.createObjectURL(res.data);
  try {
    const anchor = document.createElement(`a`);
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = `noopener`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
};
