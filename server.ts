import express, { Request } from "express";
import { parseAbi, createPublicClient, http, parseEther, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { getBalancesForAllNotes } from "./balanceService";
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

app.get("/", async (req, res) => {
  try {

    const blockNumber = await getBlockNumberOrDefault(req);

    const balances = await getBalancesForAllNotes(client, blockNumber);

    const formattedBalances = Object.entries(balances).map(([owner, balance]) => ({
      address: owner,
      effective_balance: parseFloat(formatEther(balance))
    }));

    res.json({ "Result": formattedBalances });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
