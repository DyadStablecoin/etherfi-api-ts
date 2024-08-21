import { parseAbi, PublicClient } from "viem";

const dnftAddress: `0x${string}` = "0xDc400bBe0B8B79C07A962EA99a642F5819e3b712";
const vaultAddress: `0x${string}` = "0x5B74DD13D4136443A7831fB7AD139BA123B5071B";

const dnftAbi = parseAbi([
    "function totalSupply() view returns(uint256)",
    "function ownerOf(uint256 tokenId) view returns(address)",
]);
const vaultAbi = parseAbi(["function id2asset(uint256 id) view returns(uint256)"]);

export async function getBalancesForAllNotes(client: PublicClient, blockNumber: bigint): Promise<Record<string, bigint>> {
    const totalSupply = await client.readContract({
        address: dnftAddress,
        abi: dnftAbi,
        functionName: "totalSupply",
        blockNumber
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
        blockNumber
    }) as unknown as Promise<string[]>;

    const balancesRead = client.multicall({
        contracts: ids.map((id) => ({
            address: vaultAddress,
            abi: vaultAbi,
            functionName: "id2asset",
            args: [BigInt(id)],
        })),
        allowFailure: false,
        blockNumber
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

    return balances;
}