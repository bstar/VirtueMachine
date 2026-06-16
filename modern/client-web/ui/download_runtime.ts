export type DownloadDocumentRuntime = Pick<Document, "body" | "createElement">;
export type DownloadUrlRuntime = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

export function capturedFileTextRuntime(filename: unknown): string {
  return `Captured ${String(filename || "")}`;
}

export function triggerDownloadRuntime(args: {
  document: DownloadDocumentRuntime;
  filename: string;
  href: string;
}): void {
  const link = args.document.createElement("a");
  link.href = String(args.href || "");
  link.download = String(args.filename || "");
  args.document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadCanvasPngRuntime(args: {
  canvas: HTMLCanvasElement;
  document: DownloadDocumentRuntime;
  filename: string;
}): void {
  triggerDownloadRuntime({
    document: args.document,
    filename: args.filename,
    href: args.canvas.toDataURL("image/png")
  });
}

export function jsonBlobRuntime(data: unknown): Blob {
  return new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
}

export function downloadJsonFileRuntime(args: {
  data: unknown;
  document: DownloadDocumentRuntime;
  filename: string;
  url: DownloadUrlRuntime;
}): void {
  const objectUrl = args.url.createObjectURL(jsonBlobRuntime(args.data));
  try {
    triggerDownloadRuntime({
      document: args.document,
      filename: args.filename,
      href: objectUrl
    });
  } finally {
    args.url.revokeObjectURL(objectUrl);
  }
}
