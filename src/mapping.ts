import { near, log, BigInt, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { Account, Swap, AddLiquidity } from "../generated/schema";

export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;
  
  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i], 
      receipt.receipt, 
      receipt.block.header,
      receipt.outcome
      );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader,
  outcome: near.ExecutionOutcome
): void {
  
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }
  
  let accounts = new Account(receipt.signerId);
  const functionCall = action.toFunctionCall();

  // change the methodName here to the methodName emitting the log in the contract
  if (functionCall.methodName == "swap") {
    const receiptId = receipt.id.toHexString();
      accounts.signerId = receipt.signerId;
      accounts.blockTimestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
      
      // Maps the JSON formatted log to the LOG entity
      let logs = new Swap(`${receiptId}`);
      if(outcome.logs[0]!=null){
        logs.id = receipt.signerId;
        logs.output = outcome.logs[0]
        logs.blockTimestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
        let rawString = outcome.logs[0]
        let splitString = rawString.split(' ')
        logs.action = splitString[0].toString()
        logs.firstTokenAmount = BigInt.fromString(splitString[1])
        logs.firstToken = splitString[2].toString()
        logs.secondTokenAmount = BigInt.fromString(splitString[4])
        logs.secondToken = splitString[5].toString()

        logs.save()
      }

      accounts.swap.push(logs.id);
      
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

   // change the methodName here to the methodName emitting the log in the contract
   if (functionCall.methodName == "add_liquidity") {
    const receiptId = receipt.id.toHexString();
      accounts.signerId = receipt.signerId;

      // Maps the JSON formatted log to the LOG entity
      let liquidity = new AddLiquidity(`${receiptId}`);
      if(outcome.logs[0]!=null){
        liquidity.id = receipt.signerId;
        liquidity.output = outcome.logs[0]
        liquidity.blockTimestamp = BigInt.fromU64(blockHeader.timestampNanosec/1000000000)
        let rawString = outcome.logs[0]
        let splitString = rawString.split(' ')
        liquidity.functionCalled = functionCall.methodName
        liquidity.functionAction = (splitString[0] + ' ' + splitString[1])
        liquidity.firstPoolAmount = BigInt.fromString(splitString[2].split('"')[1])
        liquidity.firstPool = splitString[3].slice(0, -2)
        liquidity.secondPoolAmount = BigInt.fromString(splitString[4].split('"')[1])
        liquidity.secondPool = splitString[5].slice(0, -3)
        liquidity.sharesMinted = BigInt.fromString(splitString[7])

        liquidity.save()
      }
      accounts.liquidity.push(liquidity.id);
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

  accounts.save();
}
