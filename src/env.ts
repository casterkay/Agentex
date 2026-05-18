import { readFile } from "node:fs/promises";

export async function loadDotEnv(filePath = ".env", options: { override?: boolean } = {}): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const loaded: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equals = line.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const name = line.slice(0, equals).trim();
    const value = unquote(line.slice(equals + 1).trim());
    loaded.push(name);
    if (options.override === true || process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
  return loaded;
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
