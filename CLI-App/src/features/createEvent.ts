/**
 * Create Event Feature
 * Handles the complete event creation flow
 */

import { ethers } from "ethers";
import { showSectionTitle, showSuccess, showError, showWarning, showInfo, createSpinner, showTxLink } from "../frontend/display.js";
import { promptCreateEvent, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateCreateEventParams } from "../utils/validate.js";
import { buildActivityContent, buildLatitudeLongitude } from "../utils/content.js";
import { toWei, fromWei, formatNumber } from "../utils/format.js";
import { dateToUnix } from "../utils/time.js";
import { getAddress, TOKEN_DECIMALS } from "../config/addresses.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { approveEventManager } from "../blockchain/approval.js";
import { getWalletAddress, getBalances } from "../wallet/connection.js";

export async function createEventFeature(): Promise<void> {
    showSectionTitle("CREATE EVENT");
    
    try {
        const params = await promptCreateEvent();
        
        const validation = validateCreateEventParams({
            ...params,
            dropType: params.dropType as 1 | 2,
        });
        
        if (!validation.valid) {
            for (const error of validation.errors) {
                showError(error);
            }
            await promptContinue();
            return;
        }
        
        // Drop type is always EVEN (1) now
        const tokenAddress = params.token === "FCC" 
            ? getAddress("FCC_TOKEN") 
            : getAddress("USDT_TOKEN");
        
        const decimals = params.token === "FCC" ? TOKEN_DECIMALS.FCC : TOKEN_DECIMALS.USDT;
        const minDropAmtWei = toWei(params.minDropAmt, decimals);
        const maxDropAmtWei = toWei(params.maxDropAmt, decimals);
        const totalDropAmts = maxDropAmtWei * BigInt(params.dropNumber);
        
        const walletAddress = getWalletAddress();
        const balances = await getBalances();
        const requiredBalance = params.token === "FCC" ? balances.fcc : balances.usdt;
        
        if (requiredBalance < totalDropAmts) {
            const required = fromWei(totalDropAmts, decimals);
            const available = fromWei(requiredBalance, decimals);
            showError(`Insufficient ${params.token} balance. Required: ${required}, Available: ${available}`);
            await promptContinue();
            return;
        }
        
        console.log("\n📋 Event Summary:");
        console.log(`   Name: ${params.businessName}`);
        console.log(`   Token: ${params.token === "FCC" ? "🍥 FCC" : "💲 USDT"}`);
        console.log(`   Drop Type: Even (fixed amount)`);
        console.log(`   Amount/Drop: ${params.maxDropAmt} ${params.token}`);
        console.log(`   Number of Drops: ${params.dropNumber}`);
        console.log(`   Total Budget: ${formatNumber(params.maxDropAmt * params.dropNumber)} ${params.token}`);
        console.log(`   Deadline: ${params.endTime.toLocaleString()}`);
        console.log(`   Location: West Sulawesi, Indonesia`);
        console.log();
        
        const confirmed = await promptConfirm("Create this event?");
        if (!confirmed) {
            showInfo("Event creation cancelled");
            await promptContinue();
            return;
        }
        
        const approvalSpinner = createSpinner("Checking token allowance...");
        
        const eventManagerAddress = getAddress("EVENT_MANAGER");
        const approvalResult = await approveEventManager(tokenAddress, totalDropAmts);
        
        if (approvalResult.needed) {
            approvalSpinner.text = "Approving tokens...";
            if (!approvalResult.result?.success) {
                approvalSpinner.fail("Token approval failed");
                showError(approvalResult.result?.error || "Approval transaction failed");
                await promptContinue();
                return;
            }
            approvalSpinner.succeed("Tokens approved");
            showTxLink(approvalResult.result.hash!);
        } else {
            approvalSpinner.succeed("Token allowance sufficient");
        }
        
        const createSpinnerObj = createSpinner("Creating event...");
        
        const activityContent = buildActivityContent({
            description: params.description,
            address: params.address,
            link: params.link,
            startTime: params.startTime,
            endTime: params.endTime,
        });
        
        const latitudeLongitude = buildLatitudeLongitude(params.latitude, params.longitude);
        const deadlineUnix = dateToUnix(params.endTime);
        
        const eventManager = getEventManagerContract(true);
        
        const tx = await eventManager.activityAdd(
            params.businessName,
            activityContent,
            latitudeLongitude,
            deadlineUnix,           // _activityDeadLine at position 4
            totalDropAmts,          // _totalDropAmts
            1,                      // _dropType = EVEN always
            params.dropNumber,      // _dropNumber
            minDropAmtWei,          // _minDropAmt
            maxDropAmtWei,          // _maxDropAmt
            tokenAddress            // _tokenContractAddr at position 10
        );
        
        createSpinnerObj.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            createSpinnerObj.fail("Event creation failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        let eventId = "Unknown";
        for (const log of receipt.logs) {
            try {
                const parsed = eventManager.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data,
                });
                if (parsed && parsed.name === "ActivityAdd") {
                    eventId = parsed.args.activityId?.toString() || "Unknown";
                    break;
                }
            } catch {
                continue;
            }
        }
        
        createSpinnerObj.succeed(`Event #${eventId} created successfully!`);
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to create event");
        }
    }
    
    await promptContinue();
}
