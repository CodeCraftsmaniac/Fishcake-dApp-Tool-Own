/**
 * Batch Drop Feature
 * Send drops to multiple addresses
 */

import chalk from "chalk";
import { showSectionTitle, showSuccess, showError, showInfo, showWarning, createSpinner, showBatchDropResults, showTxLink, showProgressBar } from "../frontend/display.js";
import { promptEventId, promptBatchAddresses, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateAddresses } from "../utils/validate.js";
import { toWei, fromWei, shortenAddress } from "../utils/format.js";
import { nowUnix } from "../utils/time.js";
import { getEventManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, TOKEN_DECIMALS } from "../config/addresses.js";
import type { BatchDropResult } from "../types/index.js";

export async function batchDropFeature(): Promise<void> {
    showSectionTitle("BATCH DROP");
    
    try {
        const eventId = await promptEventId();
        
        const spinner = createSpinner(`Loading event #${eventId}...`);
        
        const eventManager = getEventManagerContract();
        const walletAddress = getWalletAddress();
        const arrayIndex = eventId - 1;
        
        const [baseInfo, extInfo] = await Promise.all([
            eventManager.activityInfoArrs(arrayIndex),
            eventManager.activityInfoExtArrs(arrayIndex),
        ]);
        
        if (!baseInfo || Number(baseInfo.activityId) === 0) {
            spinner.fail("Event not found");
            showError(`Event #${eventId} does not exist`);
            await promptContinue();
            return;
        }
        
        if (baseInfo.businessAccount.toLowerCase() !== walletAddress.toLowerCase()) {
            spinner.fail("Not authorized");
            showError("Only the event owner can drop rewards");
            await promptContinue();
            return;
        }
        
        if (Number(extInfo.activityStatus) === 2) {
            spinner.fail("Event finished");
            showError("This event has already been finished");
            await promptContinue();
            return;
        }
        
        const deadline = Number(baseInfo.activityDeadLine);
        if (deadline < nowUnix()) {
            spinner.fail("Event expired");
            showError("This event has expired");
            await promptContinue();
            return;
        }
        
        const dropsRemaining = Number(baseInfo.dropNumber) - Number(extInfo.alreadyDropNumber);
        if (dropsRemaining <= 0) {
            spinner.fail("No drops remaining");
            showError("All drops have been executed for this event");
            await promptContinue();
            return;
        }
        
        spinner.succeed(`Event loaded - ${dropsRemaining} drops remaining`);
        
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const dropType = Number(baseInfo.dropType);
        const dropAmount = BigInt(baseInfo.maxDropAmt);
        
        console.log(`\n📋 Event: #${eventId} - ${baseInfo.businessName}`);
        console.log(`   Token: ${tokenSymbol}`);
        console.log(`   Drop Type: ${dropType === 1 ? "Even" : "Random"}`);
        console.log(`   Amount per drop: ${fromWei(dropAmount, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        console.log(`   Remaining drops: ${dropsRemaining}\n`);
        
        const addresses = await promptBatchAddresses();
        
        const { valid, invalid } = validateAddresses(addresses);
        
        if (invalid.length > 0) {
            showWarning(`${invalid.length} invalid address(es) will be skipped:`);
            for (const addr of invalid.slice(0, 5)) {
                console.log(chalk.dim(`   - ${addr}`));
            }
            if (invalid.length > 5) {
                console.log(chalk.dim(`   ... and ${invalid.length - 5} more`));
            }
        }
        
        if (valid.length === 0) {
            showError("No valid addresses to process");
            await promptContinue();
            return;
        }
        
        if (valid.length > dropsRemaining) {
            showWarning(`Only ${dropsRemaining} drops remaining. ${valid.length - dropsRemaining} address(es) will be skipped.`);
            valid.splice(dropsRemaining);
        }
        
        console.log(`\n📤 Ready to drop to ${valid.length} address(es)`);
        console.log(`   Total: ${fromWei(dropAmount * BigInt(valid.length), TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        
        const confirmed = await promptConfirm(`Proceed with batch drop to ${valid.length} addresses?`);
        if (!confirmed) {
            showInfo("Batch drop cancelled");
            await promptContinue();
            return;
        }
        
        const results: BatchDropResult[] = [];
        const eventManagerSigned = getEventManagerContract(true);
        
        console.log("\n");
        
        for (let i = 0; i < valid.length; i++) {
            const address = valid[i];
            const progress = showProgressBar(i + 1, valid.length);
            process.stdout.write(`\r${progress} Processing ${shortenAddress(address)}...`);
            
            try {
                const alreadyDropped = await eventManager.activityDroppedToAccount(eventId, address);
                
                if (alreadyDropped) {
                    results.push({
                        address,
                        status: "SKIPPED",
                        reason: "Already dropped",
                    });
                    continue;
                }
                
                const gasOverride = await getFastGasOverride();
                const tx = await eventManagerSigned.drop(eventId, address, dropAmount, gasOverride);
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    results.push({
                        address,
                        status: "SUCCESS",
                        txHash: receipt.hash,
                        amount: fromWei(dropAmount, TOKEN_DECIMALS.FCC),
                    });
                } else {
                    results.push({
                        address,
                        status: "FAILED",
                        reason: "TX reverted",
                    });
                }
            } catch (error) {
                results.push({
                    address,
                    status: "FAILED",
                    reason: error instanceof Error ? error.message.slice(0, 30) : "Unknown error",
                });
            }
        }
        
        console.log("\n\n");
        
        const successful = results.filter(r => r.status === "SUCCESS").length;
        const skipped = results.filter(r => r.status === "SKIPPED").length;
        const failed = results.filter(r => r.status === "FAILED").length;
        
        showSuccess(`Batch drop complete: ${successful} successful, ${skipped} skipped, ${failed} failed`);
        
        console.log("\n📊 Results:");
        showBatchDropResults(results);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to execute batch drop");
        }
    }
    
    await promptContinue();
}
