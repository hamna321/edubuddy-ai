import { parseOfficeAsync } from "officeparser";

// Supported upload types -> friendly label
export const SUPPORTED = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
};

export function extEmoji(mimetype) {
  if (mimetype?.includes("pdf")) return "📄";
  if (mimetype?.includes("presentation") || mimetype?.includes("powerpoint")) return "📊";
  if (mimetype?.includes("word")) return "📝";
  return "📎";
}

/** Extract plain text from a PDF/PPTX/DOCX file on disk. */
export async function extractText(filePath) {
  const text = await parseOfficeAsync(filePath);
  return (text || "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
}
