let pdfWorkerConfigured = false;

export type ParsedResumeFile = {
  text: string;
  kind: "pdf" | "docx" | "text";
};

function normalizeExtractedText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

async function parsePdf(file: File): Promise<ParsedResumeFile> {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    pdfWorkerConfigured = true;
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: { str?: string }) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (text) {
      pages.push(text);
    }
  }

  return {
    text: normalizeExtractedText(pages.join("\n\n")),
    kind: "pdf",
  };
}

async function parseDocx(file: File): Promise<ParsedResumeFile> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });

  return {
    text: normalizeExtractedText(value),
    kind: "docx",
  };
}

async function parsePlainText(file: File): Promise<ParsedResumeFile> {
  return {
    text: normalizeExtractedText(await file.text()),
    kind: "text",
  };
}

export async function parseResumeFile(file: File): Promise<ParsedResumeFile> {
  const extension = getFileExtension(file.name);

  if (extension === "pdf") {
    return parsePdf(file);
  }

  if (extension === "docx") {
    return parseDocx(file);
  }

  if (extension === "doc") {
    throw new Error("Legacy .doc files are not supported yet. Please re-save the document as .docx or PDF.");
  }

  if (
    file.type.startsWith("text/") ||
    extension === "txt" ||
    extension === "md" ||
    extension === "text"
  ) {
    return parsePlainText(file);
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or text resume.");
}
