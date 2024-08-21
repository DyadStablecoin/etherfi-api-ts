import express from "express";
import { parseAbi, createPublicClient, http, parseEther, formatEther } from "viem";
import { mainnet } from "viem/chains";
require("dotenv").config();

const app = express();
const port = 8080;

const dnftAddress: `0x${string}` = "0xDc400bBe0B8B79C07A962EA99a642F5819e3b712";
const vaultAddress: `0x${string}` = "0x5B74DD13D4136443A7831fB7AD139BA123B5071B";

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC),
})

// Contract details
const contractAddress = process.env.CONTRACT_ADDRESS;
const dnftAbi = parseAbi([
  "function totalSupply() view returns(uint256)",
  "function ownerOf(uint256 tokenId) view returns(address)",
]);
const vaultAbi = parseAbi(["function id2asset(uint256 id) view returns(uint256)"]);

app.get("/", async (req, res) => {
  try {
    const totalSupply = await client.readContract({
      address: dnftAddress,
      abi: dnftAbi,
      functionName: "totalSupply",
    });

    const ids = Array.from(new Array(Number(totalSupply))).map((_, index) => index);

    const ownersRead = client.multicall({
      contracts: ids.map((id) => ({
        address: dnftAddress,
        abi: dnftAbi,
        functionName: "ownerOf",
        args: [BigInt(id)],
      })),
      allowFailure: false,
    }) as unknown as Promise<string[]>;

    const balancesRead = client.multicall({
      contracts: ids.map((id) => ({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "id2asset",
        args: [BigInt(id)],
      })),
      allowFailure: false,
    });

    const results = await Promise.all([ownersRead, balancesRead]);

    const balances: Record<string, bigint> = {};

    for (let i = 0; i < ids.length; i++) {
      const owner = results[0][i];
      const balance = results[1][i];
      if (balance > 0n) {
        if (balances[owner] === undefined) {
          balances[owner] = 0n;
        }
        balances[owner] += balance;
      }
    }

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
