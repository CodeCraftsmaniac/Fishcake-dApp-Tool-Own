/**
 * Finish Event Feature
 * End an event and receive refund + mining rewards
 */

import { showSectionTitle, showSuccess, showError, showInfo, showWarning, createSpinner, showTxLink } from "../frontend/display.js";
import { promptEventId, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { fromWei, formatNumber } from "../utils/format.js";
import { nowUnix, formatDateTime } from "../utils/time.js";
import { getEventManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, TOKEN_DECIMALS } from "../config/addresses.js";
import chalk from "chalk";

export async function finishEventFeature(): Promise<void> {
    showSectionTitle("FINISH EVENT");
    
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
            showError("Only the event owner can finish an event");
            await promptContinue();
            return;
        }
        
        if (Number(extInfo.activityStatus) === 2) {
            spinner.fail("Already finished");
            showError("This event has already been finished");
            await promptContinue();
            return;
        }
        
        spinner.succeed("Event loaded");
        
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const totalBudget = BigInt(baseInfo.maxDropAmt) * BigInt(baseInfo.dropNumber);
        const alreadyDropped = BigInt(extInfo.alreadyDropAmts);
        const estimatedRefund = totalBudget - alreadyDropped;
        
        const deadline = Number(baseInfo.activityDeadLine);
        const now = nowUnix();
        const isExpired = deadline < now;
        
        console.log("\n📋 Event Summary:");
        console.log(`   Event: #${eventId} - ${baseInfo.businessName}`);
        console.log(`   Token: ${tokenSymbol}`);
        console.log(`   Total Budget: ${fromWei(totalBudget, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        console.log(`   Already Dropped: ${fromWei(alreadyDropped, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        console.log(`   Drops: ${extInfo.alreadyDropNumber} / ${baseInfo.dropNumber}`);
        console.log(`   Deadline: ${formatDateTime(deadline)} ${isExpired ? chalk.yellow("(EXPIRED)") : chalk.green("(ACTIVE)")}`);
        console.log();
        console.log(chalk.cyan("Estimated on Finish:"));
        console.log(`   Refund: ${chalk.green("+" + fromWei(estimatedRefund, TOKEN_DECIMALS.FCC))} ${tokenSymbol}`);
        console.log(`   Mining: ${chalk.green("+X.XX")} FCC (depends on NFT status)`);
        
        if (!isExpired) {
            showWarning("\nThis event is still active. Are you sure you want to finish it early?");
        }
        
        const confirmed = await promptConfirm("\nFinish this event?");
        if (!confirmed) {
            showInfo("Event finish cancelled");
            await promptContinue();
            return;
        }
        
        const finishSpinner = createSpinner("Finishing event...");
        
        const eventManagerSigned = getEventManagerContract(true);
        const gasOverride = await getFastGasOverride();
        const tx = await eventManagerSigned.activityFinish(eventId, gasOverride);
        
        finishSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            finishSpinner.fail("Transaction failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        let returnAmount = 0n;
        let minedAmount = 0n;
        
        for (const log of receipt.logs) {
            try {
                const parsed = eventManager.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data,
                });
                if (parsed && parsed.name === "ActivityFinish") {
                    returnAmount = BigInt(parsed.args.returnAmount || 0);
                    minedAmount = BigInt(parsed.args.minedAmount || 0);
                    break;
                }
            } catch {
                continue;
            }
        }
        
        finishSpinner.succeed(`Event #${eventId} finished!`);
        
        console.log("\n📊 Final Summary:");
        console.log(`   Total Budget:    ${fromWei(totalBudget, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        console.log(`   Drops Executed:  ${extInfo.alreadyDropNumber} / ${baseInfo.dropNumber}`);
        console.log(`   Amount Dropped:  ${fromWei(alreadyDropped, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        console.log(chalk.green(`   Refunded:        +${fromWei(returnAmount, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`));
        console.log(chalk.green(`   Mining Reward:   +${fromWei(minedAmount, TOKEN_DECIMALS.FCC)} FCC`));
        
        console.log();
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to finish event");
        }
    }
    
    await promptContinue();
}
