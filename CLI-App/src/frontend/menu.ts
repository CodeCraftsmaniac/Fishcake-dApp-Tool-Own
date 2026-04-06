/**
 * Main Menu - CLI main loop with live dashboard
 * FAST LOADING: Dashboard loads in parallel, events from cache
 */

import chalk from "chalk";
import { showMainMenu, showError, clearScreen, showGoodbye, newLine, createSpinner } from "./display.js";
import { promptMainMenu } from "./prompts.js";
import { renderFullDashboard, clearDashboardCache, renderGradientLine } from "./liveDashboard.js";
import { getUserEventsInstant } from "../cache/eventCache.js";
import { getWalletAddress } from "../wallet/connection.js";
import { createEventFeature } from "../features/createEvent.js";
import { myEventsFeature } from "../features/myEvents.js";
import { eventDetailFeature } from "../features/eventDetail.js";
import { finishEventFeature } from "../features/finishEvent.js";
import { dropRewardFeature } from "../features/drop.js";
import { batchDropFeature } from "../features/batchDrop.js";
import { claimQRFeature } from "../features/claimQR.js";
import { dropHistoryFeature } from "../features/dropHistory.js";
import { buyFCCFeature } from "../features/buyFCC.js";
import { sellFCCFeature } from "../features/buyFCC.js";
import { mintBasicNFTFeature, mintProNFTFeature } from "../features/mintNFT.js";
import { dashboardFeature } from "../features/dashboard.js";
import { miningStatusFeature } from "../features/dashboard.js";
import { browseEventsFeature } from "../features/browseEvents.js";
import { quickAirdropFeature } from "../features/quickAirdrop.js";
import { addressBookFeature } from "../features/addressBook.js";
import { walletManagementFeature } from "../features/walletManagement.js";

export async function runMainMenu(): Promise<void> {
    let running = true;
    let firstRun = true;
    
    // Start background event cache update on first run
    const address = getWalletAddress();
    getUserEventsInstant(address).catch(() => {}); // Fire and forget
    
    while (running) {
        try {
            clearScreen();
            
            // Show loading on first run only
            if (firstRun) {
                const spinner = createSpinner("Loading dashboard...");
                try {
                    const dashboard = await renderFullDashboard();
                    spinner.stop();
                    clearScreen();
                    console.log(dashboard);
                } catch {
                    spinner.stop();
                    console.log(chalk.yellow("⚠️  Dashboard loading..."));
                }
                firstRun = false;
            } else {
                // Quick render (uses cached data)
                try {
                    const dashboard = await renderFullDashboard();
                    console.log(dashboard);
                } catch {
                    console.log(chalk.yellow("⚠️  Dashboard unavailable"));
                }
            }
            
            showMainMenu();
            
            const choice = await promptMainMenu();
            
            newLine();
            
            // Clear cache after actions that might change state
            const cacheInvalidatingActions = ["1", "4", "5", "6", "9", "10", "11", "12", "q"];
            if (cacheInvalidatingActions.includes(choice)) {
                clearDashboardCache();
            }
            
            switch (choice) {
                case "0":
                    running = false;
                    showGoodbye();
                    break;
                
                // Quick Actions
                case "q":
                    await quickAirdropFeature();
                    clearDashboardCache();
                    break;
                    
                case "a":
                    await addressBookFeature();
                    break;
                    
                case "w":
                    await walletManagementFeature();
                    break;
                    
                case "1":
                    await createEventFeature();
                    clearDashboardCache();
                    break;
                    
                case "2":
                    await myEventsFeature();
                    break;
                    
                case "3":
                    await eventDetailFeature();
                    break;
                    
                case "4":
                    await finishEventFeature();
                    clearDashboardCache();
                    break;
                    
                case "5":
                    await dropRewardFeature();
                    clearDashboardCache();
                    break;
                    
                case "6":
                    await batchDropFeature();
                    clearDashboardCache();
                    break;
                    
                case "7":
                    await claimQRFeature();
                    break;
                    
                case "8":
                    await dropHistoryFeature();
                    break;
                    
                case "9":
                    await buyFCCFeature();
                    clearDashboardCache();
                    break;
                    
                case "10":
                    await sellFCCFeature();
                    clearDashboardCache();
                    break;
                    
                case "11":
                    await mintBasicNFTFeature();
                    clearDashboardCache();
                    break;
                    
                case "12":
                    await mintProNFTFeature();
                    clearDashboardCache();
                    break;
                    
                case "13":
                    await dashboardFeature();
                    break;
                    
                case "14":
                    await miningStatusFeature();
                    break;
                    
                case "15":
                    await browseEventsFeature();
                    break;
                    
                default:
                    showError("Invalid option");
            }
        } catch (error) {
            if (error instanceof Error) {
                showError(error.message);
            } else {
                showError("An unexpected error occurred");
            }
        }
    }
}
