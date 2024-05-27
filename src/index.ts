import {clusterApiUrl, ConfirmedSignatureInfo, Connection, PublicKey} from "@solana/web3.js";

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=" + process.env.HELIUS_KEY);

async function calculatePumpFunProfit(walletAddress: PublicKey, myToken: PublicKey) {
    let solNetProfit = 0;
    let lastTxn: string | undefined = undefined;
    do {
        const sigs = await connection.getSignaturesForAddress(walletAddress, {limit: 500, before: lastTxn});
        if(!sigs.length) break;
        lastTxn = sigs[sigs.length - 1]?.signature;

        const sigsChunked: string[][] = [];
        for(let i = 0; i < sigs.length; i++) {
            const chunkIndex = Math.trunc(i/100);
            if(!sigsChunked[chunkIndex]) sigsChunked[chunkIndex] = [];
            sigsChunked[chunkIndex].push(sigs[i].signature);
        }

        for(const chunk of sigsChunked) {
            let chunkHasToken = false;
            let res: Response | null = null;
            do {
                res = await fetch("https://api.helius.xyz/v0/transactions?api-key=" + process.env.HELIUS_KEY, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({transactions: chunk})
                });
            } while(!res?.ok);
            const txnArr: HeliusResponse[] = await res.json();

            for(const txn of txnArr) {
                if(txn.transactionError) continue;
                const containsToken = txn.accountData.some(ad => ad.tokenBalanceChanges.some(tbc => tbc.mint == myToken.toString()));
                if(!containsToken) continue;
                const accountData = txn.accountData.find(ad => ad.account == walletAddress.toString());
                if(!accountData) continue;
                chunkHasToken = true;
                solNetProfit += accountData.nativeBalanceChange;
            }

            if(!chunkHasToken && solNetProfit != 0) return solNetProfit; //assume end, return solNetProfit
        }
    } while(true);
    return solNetProfit
}

calculatePumpFunProfit(new PublicKey("4TstnQxFS89Vfn1xtxN4V4P9mzaFiGQME1fn8EFdXCSm"), new PublicKey("Bh1vHe8suqDnRWJFzgfrXRTFQ6XiXZCip4DQLKLokB5K"))
    .then(console.log);

interface HeliusResponse {
    accountData: [
        {
            account: string,
            nativeBalanceChange: number,
            tokenBalanceChanges: [
                {
                    userAccount: string,
                    tokenAccount: string,
                    "rawTokenAmount": {
                        "tokenAmount": bigint,
                        "decimals": bigint
                    },
                    mint: string
                }
            ]
        }
    ],
    transactionError: any
}