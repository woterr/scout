import { exec } from "child_process";

export function extractFirstPageText(pdfPath: string): Promise<string> {
  return new Promise((resolve) => {
    exec(
      `pdftotext -f 1 -l 1 "${pdfPath}" -`,
      { maxBuffer: 1024 * 1024 },
      (_, stdout) => resolve(stdout.toLowerCase())
    );
  });
}
