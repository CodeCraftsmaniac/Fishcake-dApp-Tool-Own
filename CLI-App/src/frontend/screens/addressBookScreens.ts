/**
 * Address Book Screens - UI layer for address book management
 * ONLY UI CODE - Calls storage for persistence
 */

import chalk from "chalk";
import Table from "cli-table3";
import inquirer from "inquirer";
import { ethers } from "ethers";
import {
    loadAddressBook,
    saveAddressBook,
    addAddress,
    removeAddress,
    updateAddress,
    getEntries,
    type AddressEntry,
    type AddressBookData,
} from "../../storage/addressBook.js";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
} from "../display.js";
import { promptConfirm, promptContinue } from "../prompts.js";

/**
 * Display address book
 */
function displayAddressBook(addresses: AddressEntry[]): void {
    if (addresses.length === 0) {
        console.log(chalk.yellow("\n  Address book is empty.\n"));
        return;
    }

    const table = new Table({
        head: [
            chalk.cyan("#"),
            chalk.cyan("Label"),
            chalk.cyan("Address"),
        ],
        colWidths: [5, 20, 48],
    });

    addresses.forEach((addr, i) => {
        table.push([
            (i + 1).toString(),
            addr.label || chalk.gray("(no label)"),
            addr.address,
        ]);
    });

    console.log();
    console.log(table.toString());
    console.log(chalk.gray(`\n  Total: ${addresses.length} addresses\n`));
}

/**
 * Screen: View address book
 */
export async function viewAddressBookScreen(): Promise<void> {
    showSectionTitle("📒 Address Book");

    const addresses = getEntries();
    displayAddressBook(addresses);

    await promptContinue();
}

/**
 * Screen: Add single address
 */
export async function addAddressScreen(): Promise<void> {
    showSectionTitle("➕ Add Address");

    const { address, label } = await inquirer.prompt([
        {
            type: "input",
            name: "address",
            message: "Enter address:",
            validate: (v) => {
                if (!v || v.length !== 42 || !v.startsWith("0x")) {
                    return "Enter a valid Ethereum address (0x...)";
                }
                if (!ethers.isAddress(v)) {
                    return "Invalid address checksum";
                }
                return true;
            },
        },
        {
            type: "input",
            name: "label",
            message: "Label (optional):",
            default: "",
        },
    ]);

    // Check if already exists
    const existing = getEntries();
    if (existing.find(a => a.address.toLowerCase() === address.toLowerCase())) {
        showWarning("This address is already in your address book");
        await promptContinue();
        return;
    }

    addAddress(address, label || undefined);
    showSuccess(`✅ Address added: ${address.slice(0, 10)}...${address.slice(-6)}`);

    await promptContinue();
}

/**
 * Screen: Add multiple addresses (batch)
 */
export async function batchAddAddressScreen(): Promise<void> {
    showSectionTitle("📦 Batch Add Addresses");

    console.log(chalk.yellow("\n📝 Enter multiple addresses"));
    console.log(chalk.white("  Separate each address with a newline or comma.\n"));

    const { addressesRaw } = await inquirer.prompt([
        {
            type: "editor",
            name: "addressesRaw",
            message: "Enter addresses (one per line):",
        },
    ]);

    const rawAddresses = addressesRaw
        .split(/[\n,]/)
        .map((a: string) => a.trim())
        .filter((a: string) => a && a.length > 0);

    if (rawAddresses.length === 0) {
        showWarning("No addresses provided");
        await promptContinue();
        return;
    }

    // Validate all addresses
    const validAddresses: string[] = [];
    const invalidAddresses: string[] = [];

    for (const addr of rawAddresses) {
        if (addr.length === 42 && addr.startsWith("0x") && ethers.isAddress(addr)) {
            validAddresses.push(addr);
        } else {
            invalidAddresses.push(addr);
        }
    }

    if (invalidAddresses.length > 0) {
        showWarning(`Found ${invalidAddresses.length} invalid addresses:`);
        invalidAddresses.slice(0, 5).forEach(a => {
            console.log(chalk.red(`  ✗ ${a.slice(0, 20)}...`));
        });
        if (invalidAddresses.length > 5) {
            console.log(chalk.red(`  ... and ${invalidAddresses.length - 5} more`));
        }
    }

    if (validAddresses.length === 0) {
        showError("No valid addresses to add");
        await promptContinue();
        return;
    }

    showInfo(`Valid addresses: ${validAddresses.length}`);

    const confirmed = await promptConfirm(`Add ${validAddresses.length} addresses?`);
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Add all valid addresses
    const existing = getEntries();
    let added = 0;
    let skipped = 0;

    for (const addr of validAddresses) {
        if (existing.find(a => a.address.toLowerCase() === addr.toLowerCase())) {
            skipped++;
            continue;
        }
        addAddress(addr);
        added++;
    }

    console.log();
    showSuccess(`✅ Added ${added} addresses`);
    if (skipped > 0) {
        showInfo(`⏭️  Skipped ${skipped} duplicates`);
    }

    await promptContinue();
}

/**
 * Screen: Remove address
 */
export async function removeAddressScreen(): Promise<void> {
    showSectionTitle("🗑️ Remove Address");

    const addresses = getEntries();
    
    if (addresses.length === 0) {
        showWarning("Address book is empty");
        await promptContinue();
        return;
    }

    displayAddressBook(addresses);

    const { selectedIndex } = await inquirer.prompt([
        {
            type: "number",
            name: "selectedIndex",
            message: "Enter number to remove:",
            validate: (v) => v >= 1 && v <= addresses.length || `Enter 1-${addresses.length}`,
        },
    ]);

    const selectedAddress = addresses[selectedIndex - 1];

    const confirmed = await promptConfirm(
        `Remove ${selectedAddress.label || selectedAddress.address.slice(0, 10) + "..."}?`
    );
    
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    removeAddress(selectedAddress.address);
    showSuccess("✅ Address removed");

    await promptContinue();
}

/**
 * Screen: Edit address label
 */
export async function editAddressScreen(): Promise<void> {
    showSectionTitle("✏️ Edit Address");

    const addresses = getEntries();
    
    if (addresses.length === 0) {
        showWarning("Address book is empty");
        await promptContinue();
        return;
    }

    displayAddressBook(addresses);

    const { selectedIndex } = await inquirer.prompt([
        {
            type: "number",
            name: "selectedIndex",
            message: "Enter number to edit:",
            validate: (v) => v >= 1 && v <= addresses.length || `Enter 1-${addresses.length}`,
        },
    ]);

    const selectedAddress = addresses[selectedIndex - 1];

    const { newLabel } = await inquirer.prompt([
        {
            type: "input",
            name: "newLabel",
            message: "New label:",
            default: selectedAddress.label || "",
        },
    ]);

    updateAddress(selectedAddress.address, newLabel);
    showSuccess("✅ Address updated");

    await promptContinue();
}

/**
 * Screen: Clear address book
 */
export async function clearAddressBookScreen(): Promise<void> {
    showSectionTitle("🗑️ Clear Address Book");

    const addresses = getEntries();
    
    if (addresses.length === 0) {
        showWarning("Address book is already empty");
        await promptContinue();
        return;
    }

    console.log(chalk.red("\n⚠️  WARNING: This will delete all saved addresses!\n"));
    console.log(chalk.white(`  Total addresses: ${addresses.length}\n`));

    const confirmed = await promptConfirm("Are you sure you want to clear the address book?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    const doubleConfirm = await promptConfirm("This cannot be undone. Really clear?");
    if (!doubleConfirm) {
        showWarning("Cancelled");
        return;
    }

    saveAddressBook({ groups: [], recentAddresses: [], entries: [] });
    showSuccess("✅ Address book cleared");

    await promptContinue();
}

/**
 * Screen: Address book menu
 */
export async function addressBookMenuScreen(): Promise<void> {
    while (true) {
        showSectionTitle("📒 Address Book");

        const addresses = getEntries();
        displayAddressBook(addresses);

        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: "Select action:",
                choices: [
                    { name: "➕ Add address", value: "add" },
                    { name: "📦 Batch add addresses", value: "batch" },
                    { name: "✏️  Edit label", value: "edit" },
                    { name: "🗑️  Remove address", value: "remove" },
                    { name: "🗑️  Clear all", value: "clear" },
                    { name: "⬅️  Back", value: "back" },
                ],
            },
        ]);

        switch (action) {
            case "add":
                await addAddressScreen();
                break;
            case "batch":
                await batchAddAddressScreen();
                break;
            case "edit":
                await editAddressScreen();
                break;
            case "remove":
                await removeAddressScreen();
                break;
            case "clear":
                await clearAddressBookScreen();
                break;
            case "back":
                return;
        }
    }
}

/**
 * Export screen functions
 */
export const addressBookScreens = {
    view: viewAddressBookScreen,
    add: addAddressScreen,
    batchAdd: batchAddAddressScreen,
    remove: removeAddressScreen,
    edit: editAddressScreen,
    clear: clearAddressBookScreen,
    menu: addressBookMenuScreen,
};
