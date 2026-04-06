/**
 * Drop Reward Feature
 * Send reward to a single address
 */

import { showSectionTitle, showSuccess, showError, showInfo, createSpinner, showTxLink } from "../frontend/display.js";
import { promptEventId, promptAddress, promptAmount, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateDropPreConditions } from "../utils/validate.js";
import { toWei, fromWei } from "../utils/format.js";
import { nowUnix } from "../utils/time.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, TOKEN_DECIMALS } from "../config/addresses.js";
import type { Activity, ActivityExt } from "../types/index.js";

export async function dropRewardFeature(): Promise<void> {
    showSectionTitle("DROP REWARD");
    
    try {
        const eventId = await promptEventId();
        const recipientAddress = await promptAddress("Recipient wallet address:");
        
        const spinner = createSpinner("Validating...");
        
        const eventManager = getEventManagerContract();
        const walletAddress = getWalletAddress();
        const arrayIndex = eventId - 1;
        
        const [baseInfo, extInfo, alreadyDropped] = await Promise.all([
            eventManager.activityInfoArrs(arrayIndex),
            eventManager.activityInfoExtArrs(arrayIndex),
            eventManager.activityDroppedToAccount(eventId, recipientAddress),
        ]);
        
        if (!baseInfo || Number(baseInfo.activityId) === 0) {
            spinner.fail("Event not found");
            showError(`Event #${eventId} does not exist`);
            await promptContinue();
            return;
        }
        
        const activity: Activity = {
            activityId: Number(baseInfo.activityId),
            businessAccount: baseInfo.businessAccount,
            businessName: baseInfo.businessName,
            activityContent: baseInfo.activityContent,
            latitudeLongitude: baseInfo.latitudeLongitude,
            activityCreateTime: Number(baseInfo.activityCreateTime),
            activityDeadLine: Number(baseInfo.activityDeadLine),
            dropType: Number(baseInfo.dropType),
            dropNumber: Number(baseInfo.dropNumber),
            minDropAmt: BigInt(baseInfo.minDropAmt),
            maxDropAmt: BigInt(baseInfo.maxDropAmt),
            tokenContractAddr: baseInfo.tokenContractAddr,
        };
        
        const activityExt: ActivityExt = {
            activityId: Number(extInfo.activityId),
            alreadyDropAmts: BigInt(extInfo.alreadyDropAmts),
            alreadyDropNumber: Number(extInfo.alreadyDropNumber),
            businessMinedAmt: BigInt(extInfo.businessMinedAmt),
            businessMinedWithdrawedAmt: BigInt(extInfo.businessMinedWithdrawedAmt),
            activityStatus: Number(extInfo.activityStatus),
        };
        
        const tokenSymbol = getTokenSymbol(activity.tokenContractAddr);
        const dropType = activity.dropType;
        
        let dropAmount: bigint;
        
        if (dropType === 1) {
            dropAmount = activity.maxDropAmt;
            spinner.info(`Drop Type: Even - Amount: ${fromWei(dropAmount, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        } else {
            spinner.stop();
            const minAmt = parseFloat(fromWei(activity.minDropAmt, TOKEN_DECIMALS.FCC));
            const maxAmt = parseFloat(fromWei(activity.maxDropAmt, TOKEN_DECIMALS.FCC));
            
            showInfo(`Drop Type: Random - Range: ${minAmt} - ${maxAmt} ${tokenSymbol}`);
            
            const amountInput = await promptAmount(
                `Enter drop amount (${minAmt} - ${maxAmt}):`,
                minAmt,
                maxAmt
            );
            dropAmount = toWei(amountInput, TOKEN_DECIMALS.FCC);
            spinner.start("Validating...");
        }
        
        const validation = validateDropPreConditions(
            activity,
            activityExt,
            recipientAddress,
            walletAddress,
            dropAmount,
            alreadyDropped
        );
        
        if (!validation.valid) {
            spinner.fail("Validation failed");
            for (const error of validation.errors) {
                showError(error);
            }
            await promptContinue();
            return;
        }
        
        spinner.succeed("Validation passed");
        
        console.log(`\n📤 Drop Summary:`);
        console.log(`   Event: #${eventId} - ${activity.businessName}`);
        console.log(`   To: ${recipientAddress}`);
        console.log(`   Amount: ${fromWei(dropAmount, TOKEN_DECIMALS.FCC)} ${tokenSymbol}`);
        
        const confirmed = await promptConfirm("Send this drop?");
        if (!confirmed) {
            showInfo("Drop cancelled");
            await promptContinue();
            return;
        }
        
        const dropSpinner = createSpinner("Sending drop...");
        
        const eventManagerSigned = getEventManagerContract(true);
        const tx = await eventManagerSigned.drop(eventId, recipientAddress, dropAmount);
        
        dropSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            dropSpinner.fail("Drop failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        dropSpinner.succeed(`Successfully dropped ${fromWei(dropAmount, TOKEN_DECIMALS.FCC)} ${tokenSymbol}!`);
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to drop reward");
        }
    }
    
    await promptContinue();
}
