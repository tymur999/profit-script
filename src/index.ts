import {ConfirmedSignatureInfo, Connection, PublicKey} from "@solana/web3.js";

const connection = new Connection(process.env.RPC!);

//note: only supports last 1000 txns
async function calculatePumpFunProfit(walletAddress: PublicKey, myToken: PublicKey) {
    let solNetProfit = 0;
    const sigs: ConfirmedSignatureInfo[] = [];
    let lastTxn: string | undefined = undefined;
    do {
        const newSigs = await connection.getSignaturesForAddress(walletAddress, {limit: 1000, before: lastTxn});
        if(!newSigs.length) break;
        sigs.push(
            ...newSigs
        );
        lastTxn = newSigs[newSigs.length - 1]?.signature;
    } while(true);

    let irrelevantTxns = 0;
    for(const sig of sigs) {
        if(irrelevantTxns > 200) return solNetProfit;
        if(sig.err) {
            irrelevantTxns++;
            continue;
        }
        const txn = await connection.getParsedTransaction(sig.signature, {maxSupportedTransactionVersion: 0});
        if(!txn || !txn.meta) {
            irrelevantTxns++;
            continue;
        }

        //check if there was a change in myToken
        const postTokenBalances = txn.meta.postTokenBalances;
        const preTokenBalances = txn.meta.preTokenBalances;
        if(!postTokenBalances?.length && !preTokenBalances?.length) {
            irrelevantTxns++;
            continue;
        }
        const postMyToken = postTokenBalances?.find(tb => tb.mint == myToken.toString() &&
            tb.owner == walletAddress.toString());
        const preMyToken = preTokenBalances?.find(tb => tb.mint == myToken.toString() &&
            tb.owner == walletAddress.toString());
        if(!postMyToken && !preMyToken) {
            irrelevantTxns++;
            continue;
        }


        //calculate sol change
        if(!txn.meta.preBalances.length || !txn.meta.postBalances.length) {
            irrelevantTxns++;
            continue;
        }
        let solChange = txn.meta.postBalances[0] - txn.meta.preBalances[0]; //in lamports
        console.log("new transaction with sol change:", solChange);
        solNetProfit += solChange;
        irrelevantTxns = 0;
    }
    return solNetProfit
}

calculatePumpFunProfit(new PublicKey("4TstnQxFS89Vfn1xtxN4V4P9mzaFiGQME1fn8EFdXCSm"), new PublicKey("Bh1vHe8suqDnRWJFzgfrXRTFQ6XiXZCip4DQLKLokB5K"))
    .then(console.log);