import { exec } from "child_process";

export function extractText(pdfPath: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`pdfinfo "${pdfPath}"`, (_, stdout) => {
      const match = stdout?.match(/Pages:\s+(\d+)/);
      const pages = match ? parseInt(match[1]) : 1;

      const cmd =
        pages <= 10
          ? `pdftotext "${pdfPath}" -`
          : `pdftotext -f 1 -l 1 "${pdfPath}" -`;

      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (_, out) =>
        resolve((out || "").toLowerCase()),
      );
    });
  });
}
