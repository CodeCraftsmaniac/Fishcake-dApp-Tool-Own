/**
 * Claim QR Code Feature
 * Generate QR codes for event claims
 */

import QRCode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";
import fs from "fs";
import path from "path";
import { showSectionTitle, showSuccess, showError, showInfo, createSpinner } from "../frontend/display.js";
import { promptEventId, promptAddress, promptContinue, promptConfirm } from "../frontend/prompts.js";
import { buildQRClaimData } from "../utils/content.js";
import { fromWei, formatNumber } from "../utils/format.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getTokenSymbol, isFCCToken, TOKEN_DECIMALS } from "../config/addresses.js";
import type { QRClaimData } from "../types/index.js";

export async function claimQRFeature(): Promise<void> {
    showSectionTitle("GENERATE CLAIM QR CODE");
    
    try {
        const eventId = await promptEventId();
        const recipientAddress = await promptAddress("Recipient wallet address (who will claim):");
        
        const spinner = createSpinner(`Loading event #${eventId}...`);
        
        const eventManager = getEventManagerContract();
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
        
        if (alreadyDropped) {
            spinner.fail("Already claimed");
            showWarning("This address has already received a drop from this event");
            await promptContinue();
            return;
        }
        
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const tokenType = isFCCToken(baseInfo.tokenContractAddr) ? 1 : 2;
        const dropType = Number(baseInfo.dropType);
        
        let rewardAmount: string;
        
        if (dropType === 1) {
            rewardAmount = fromWei(BigInt(baseInfo.maxDropAmt), TOKEN_DECIMALS.FCC);
        } else {
            const min = parseFloat(fromWei(BigInt(baseInfo.minDropAmt), TOKEN_DECIMALS.FCC));
            const max = parseFloat(fromWei(BigInt(baseInfo.maxDropAmt), TOKEN_DECIMALS.FCC));
            const randomAmount = Math.random() * (max - min) + min;
            rewardAmount = randomAmount.toFixed(2);
        }
        
        const qrData: QRClaimData = {
            businessAccount: baseInfo.businessAccount,
            activity: eventId,
            address: recipientAddress,
            rewardAmt: rewardAmount,
            tokenType: tokenType as 1 | 2,
        };
        
        const qrString = JSON.stringify(qrData);
        
        spinner.succeed("QR data generated");
        
        console.log("\n📋 Claim Details:");
        console.log(`   Event: #${eventId} - ${baseInfo.businessName}`);
        console.log(`   Recipient: ${recipientAddress}`);
        console.log(`   Reward: ${rewardAmount} ${tokenSymbol}`);
        console.log(`   Drop Type: ${dropType === 1 ? "Even (fixed)" : "Random"}`);
        
        console.log("\n📱 Scan this QR code with the Fishcake app:\n");
        
        qrcodeTerminal.generate(qrString, { small: true }, (qrcode: string) => {
            console.log(qrcode);
        });
        
        const saveFile = await promptConfirm("Save QR code as PNG file?");
        
        if (saveFile) {
            const filename = `claim_event${eventId}_${Date.now()}.png`;
            const filepath = path.join(process.cwd(), filename);
            
            await QRCode.toFile(filepath, qrString, {
                width: 300,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            });
            
            showSuccess(`QR code saved to: ${filepath}`);
        }
        
        console.log("\n📝 Raw QR Data (JSON):");
        console.log(qrString);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to generate QR code");
        }
    }
    
    await promptContinue();
}

function showWarning(message: string): void {
    console.log(`⚠️  ${message}`);
}
