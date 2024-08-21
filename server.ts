import express, { Request } from "express";
import { parseAbi, createPublicClient, http, parseEther, formatEther, getAddress } from "viem";
import { mainnet } from "viem/chains";
import { getBalancesForAddresses, getBalancesForAllNotes } from "./balanceService";
require("dotenv").config();

const app = express();
const port = 8080;

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC),
})

async function getBlockNumberOrDefault(req: Request): Promise<bigint> {
  const blockNumberQuery = req.query["blockNumber"];
  if (blockNumberQuery && (typeof blockNumberQuery !== "string" || isNaN(parseInt(blockNumberQuery)))) {
    throw new Error("Invalid block number");
  }
  if (!blockNumberQuery) {
    return await client.getBlockNumber();
  }
  return BigInt(blockNumberQuery);
}

function parseAddressesFromQuery(req: Request): `0x${string}`[] {
  const address = req.query["address"];
  let addresses: string[]
  if (typeof address === "string") {
    addresses = [address];
  } else {
    addresses = address as string[];
  }
  const parsedAddresses = addresses.map((address) => getAddress(address));
  return parsedAddresses;
}

app.get("/", async (req, res) => {
  try {

    const blockNumber = await getBlockNumberOrDefault(req);

    let balances: Record<string, bigint>;

    if (req.query["address"]) {
      let addresses: `0x${string}`[];
      try {
        addresses = parseAddressesFromQuery(req);
      } catch (error) {
        res.status(400).json({ error: "Invalid address" });
        return;
      }
      balances = await getBalancesForAddresses(client, addresses, blockNumber);
    } else {
      balances = await getBalancesForAllNotes(client, blockNumber);
    }

    const formattedBalances = Object.entries(balances).map(([owner, balance]) => ({
      address: owner,
      effective_balance: parseFloat(formatEther(balance))
    }));

    res.status(200).json({ "Result": formattedBalances });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
