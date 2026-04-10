import type { VersionedTransaction } from "@solana/web3.js";

/**
 * Submit a bundle of signed transactions to a Jito block engine.
 *
 * Endpoint: POST {jitoUrl}/api/v1/bundles
 * Body: JSON-RPC sendBundle with base64-encoded transactions.
 *
 * For protection from reverts, group buy + tip in one bundle so they land
 * atomically on the same slot.
 */
export async function sendJitoBundle(
  transactions: VersionedTransaction[],
  jitoUrl: string,
): Promise<string> {
  if (!jitoUrl) throw new Error("JITO_BLOCK_ENGINE_URL not set");

  const encoded = transactions.map((tx) => Buffer.from(tx.serialize()).toString("base64"));

  const res = await fetch(`${jitoUrl}/api/v1/bundles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [encoded, { encoding: "base64" }],
    }),
  });

  if (!res.ok) {
    throw new Error(`jito ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { result?: string; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result ?? "";
}
