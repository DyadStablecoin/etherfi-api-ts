const express = require("express");
const { Web3 } = require("web3");
require("dotenv").config();

const app = express();
const port = 3000;

// Connect to Ethereum node using Infura
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC));

// Contract details
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractAbi = [
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

// Create a contract instance
const contract = new web3.eth.Contract(contractAbi, contractAddress);

// API endpoint to get the total number of NFTs
app.get("/api/nft-total", async (req, res) => {
  try {
    const totalSupply = await contract.methods.totalSupply().call();
    res.json({
      is_valid_endpoint: true,
      total_balance: parseFloat(totalSupply),
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
