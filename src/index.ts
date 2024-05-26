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

    const parseTasks: Promise<any>[] = [];
    for(const sig of sigs) {
        if(sig.err) continue;
        parseTasks.push(connection.getParsedTransaction(sig.signature, {maxSupportedTransactionVersion: 0})
            .then(txn => {
                if(!txn || !txn.meta) return;

                //check if there was a change in myToken
                const postTokenBalances = txn.meta.postTokenBalances;
                const preTokenBalances = txn.meta.preTokenBalances;
                if(!postTokenBalances?.length && !preTokenBalances?.length) return;
                const postMyToken = postTokenBalances?.find(tb => tb.mint == myToken.toString() &&
                    tb.owner == walletAddress.toString());
                const preMyToken = preTokenBalances?.find(tb => tb.mint == myToken.toString() &&
                    tb.owner == walletAddress.toString());
                if(!postMyToken && !preMyToken) return;


                //calculate sol change
                if(!txn.meta.preBalances.length || !txn.meta.postBalances.length) return;
                let solChange = txn.meta.postBalances[0] - txn.meta.preBalances[0]; //in lamports
                console.log("new transaction with sol change:", solChange);
                solNetProfit += solChange;
            }));
    }

    await Promise.all(parseTasks);

    console.log(solNetProfit);
}

calculatePumpFunProfit(new PublicKey("8NqLtG4BnGyQJrfu91bWK215SJ1qadfhSdygeyX6VjsM"), new PublicKey("BXAtPnRuZjPKe9Gsv9Wsgh54yqWTVT6gR7w7tSYYThnW"));