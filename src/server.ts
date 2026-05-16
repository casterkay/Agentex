import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { stableJson } from "./shared.js";
import { invokeAgeneticsTool } from "./tools.js";

export function createAgeneticsServer(): Server {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method !== "POST" || !url.pathname.startsWith("/tool/")) {
        sendJson(response, 404, { status: "error", error: "route not found" });
        return;
      }
      const toolName = url.pathname.slice("/tool/".length);
      const args = await readRequestJson(request);
      const result = await invokeAgeneticsTool(toolName, args);
      sendJson(response, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 400, { status: "error", error: message });
    }
  });
}

async function readRequestJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > 1_000_000) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(stableJson(body));
}
