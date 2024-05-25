import {Connection, PublicKey} from "@solana/web3.js";

const connection = new Connection(process.env.RPC!);

//note: only supports last 1000 txns
async function calculatePumpFunProfit(walletAddress: PublicKey, myToken: PublicKey) {
    let solNetProfit = 0;
    const sigs = await connection.getSignaturesForAddress(myToken, {limit: 1000});
    for(const sig of sigs) {
        if(sig.err) continue;
        const txn = await connection.getParsedTransaction(sig.signature, {maxSupportedTransactionVersion: 0});
        if(!txn || !txn.meta) continue;

        //check if there was a change in myToken
        const postTokenBalances = txn.meta.postTokenBalances;
        const preTokenBalances = txn.meta.preTokenBalances;
        if(!postTokenBalances?.length && !preTokenBalances?.length) continue;
        const postMyToken = postTokenBalances?.find(tb => tb.mint == myToken.toString() &&
            tb.owner == walletAddress.toString());
        const preMyToken = preTokenBalances?.find(tb => tb.mint == myToken.toString() &&
            tb.owner == walletAddress.toString());
        if(!postMyToken && !preMyToken) continue;


        //calculate sol change
        if(!txn.meta.preBalances.length || !txn.meta.postBalances.length) continue;
        let solChange = txn.meta.postBalances[0] - txn.meta.preBalances[0]; //in lamports
        console.log("new transaction with sol change:", solChange);
        solNetProfit += solChange;
    }

    console.log(solNetProfit);
}

calculatePumpFunProfit(new PublicKey("BUmWvaEF46YHAGmn3ePQLPEvt19sm6k6JRnKHHTiE4Ag"), new PublicKey("3sSrCimwDE246Lb2HXoogLmAd9jPx6K2ArA4joQZgFL1"));