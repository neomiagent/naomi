import type { Logger } from "pino";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import type { Address, ContractFlags } from "../types.js";
import type { Env } from "../config.js";

const VERIFY_RE = /(MintError|notMint|onlyOwner)/i;

interface SourceCodeResponse {
  status: string;
  result: Array<{
    SourceCode: string;
    ContractName: string;
    Proxy: string;
    Implementation: string;
  }>;
}

export async function checkContract(
  token: Address,
  env: Env,
  logger: Logger,
): Promise<ContractFlags> {
  const flags: ContractFlags = {
    verified: false,
    ownershipRenounced: false,
    hasMintFunction: false,
    hasBlacklistFunction: false,
    hasPauseFunction: false,
    proxyContract: false,
  };

  if (!env.etherscanApiKey) {
    logger.debug({ token }, "skipping contract verify check, no etherscan key");
    return flags;
  }

  const url =
    `https://api.etherscan.io/api?module=contract&action=getsourcecode` +
    `&address=${token}&apikey=${env.etherscanApiKey}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as SourceCodeResponse;
    if (data.status !== "1" || !data.result?.[0]) return flags;

    const entry = data.result[0];
    flags.verified = entry.SourceCode.length > 0;
    flags.proxyContract = entry.Proxy === "1";

    if (flags.verified) {
      const src = entry.SourceCode;
      flags.hasMintFunction = /function\s+mint\s*\(/i.test(src) && !VERIFY_RE.test(src);
      flags.hasBlacklistFunction = /(blacklist|denylist|isBlocked)/i.test(src);
      flags.hasPauseFunction = /function\s+pause\s*\(/i.test(src);
    }

    flags.ownershipRenounced = await isOwnershipRenounced(token, env, logger);
  } catch (err) {
    logger.warn({ err, token }, "etherscan verify check failed");
  }

  return flags;
}

async function isOwnershipRenounced(
  token: Address,
  env: Env,
  logger: Logger,
): Promise<boolean> {
  const client: PublicClient = createPublicClient({
    chain: mainnet,
    transport: http(env.rpcUrl),
  });

  try {
    const owner = await client.readContract({
      address: token,
      abi: [
        {
          type: "function",
          name: "owner",
          inputs: [],
          outputs: [{ type: "address" }],
          stateMutability: "view",
        },
      ],
      functionName: "owner",
    });
    return owner === "0x0000000000000000000000000000000000000000";
  } catch (err) {
    logger.debug({ err, token }, "owner() not callable, treating as renounced/non-ownable");
    return true;
  }
}
// etherscan returns '' for unverified
// owner can be address or revert
