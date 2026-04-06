/**
 * Address Book Management Feature
 * Manage saved address groups for quick drops
 */

import chalk from "chalk";
import inquirer from "inquirer";
import Table from "cli-table3";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
} from "../frontend/display.js";
import { promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateAddresses } from "../utils/validate.js";
import { shortenAddress } from "../utils/format.js";
import {
    getAddressGroups,
    addAddressGroup,
    deleteAddressGroup,
    updateAddressGroup,
    getRecentAddresses,
    AddressGroup,
} from "../storage/addressBook.js";

export async function addressBookFeature(): Promise<void> {
    showSectionTitle("📖 ADDRESS BOOK");

    let running = true;

    while (running) {
        const groups = getAddressGroups();
        const recentAddresses = getRecentAddresses(5);

        // Display current groups
        if (groups.length > 0) {
            console.log(chalk.cyan("\n📋 Saved Address Groups:\n"));
            const table = new Table({
                head: [
                    chalk.cyan("#"),
                    chalk.cyan("Name"),
                    chalk.cyan("Addresses"),
                    chalk.cyan("Last Used"),
                ],
                colWidths: [5, 30, 12, 20],
            });

            groups.forEach((group, i) => {
                table.push([
                    (i + 1).toString(),
                    group.name,
                    group.addresses.length.toString(),
                    group.lastUsed
                        ? new Date(group.lastUsed).toLocaleDateString()
                        : "-",
                ]);
            });

            console.log(table.toString());
        } else {
            console.log(chalk.dim("\nNo saved address groups yet.\n"));
        }

        if (recentAddresses.length > 0) {
            console.log(chalk.dim("\n📌 Recent addresses:"));
            recentAddresses.forEach((addr) => {
                console.log(chalk.dim(`   ${shortenAddress(addr)}`));
            });
        }

        console.log();

        // Menu
        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: "What would you like to do?",
                choices: [
                    { name: "➕ Add new address group", value: "add" },
                    { name: "📋 View group addresses", value: "view" },
                    { name: "✏️  Edit group", value: "edit" },
                    { name: "🗑️  Delete group", value: "delete" },
                    { name: "🔙 Back to menu", value: "back" },
                ],
            },
        ]);

        switch (action) {
            case "add":
                await addNewGroup();
                break;
            case "view":
                await viewGroup(groups);
                break;
            case "edit":
                await editGroup(groups);
                break;
            case "delete":
                await deleteGroup(groups);
                break;
            case "back":
                running = false;
                break;
        }
    }
}

async function addNewGroup(): Promise<void> {
    const { name } = await inquirer.prompt([
        {
            type: "input",
            name: "name",
            message: "Group name:",
            validate: (input: string) =>
                input.trim().length > 0 || "Name is required",
        },
    ]);

    const { input } = await inquirer.prompt([
        {
            type: "input",
            name: "input",
            message: "Enter addresses (comma-separated or file.txt):",
        },
    ]);

    let addresses: string[] = [];
    const trimmed = input.trim();

    if (trimmed.endsWith(".txt")) {
        try {
            const fs = await import("fs");
            const content = fs.readFileSync(trimmed, "utf8");
            addresses = content
                .split("\n")
                .map((a: string) => a.trim())
                .filter((a: string) => a.length > 0);
        } catch (error) {
            showError("Could not read file");
            return;
        }
    } else {
        addresses = trimmed
            .split(",")
            .map((a: string) => a.trim())
            .filter((a: string) => a.length > 0);
    }

    const { valid, invalid } = validateAddresses(addresses);

    if (invalid.length > 0) {
        showWarning(`${invalid.length} invalid addresses will be excluded`);
    }

    if (valid.length === 0) {
        showError("No valid addresses to save");
        return;
    }

    const group = addAddressGroup(name.trim(), valid);
    showSuccess(`Created group "${group.name}" with ${valid.length} addresses`);
}

async function viewGroup(groups: AddressGroup[]): Promise<void> {
    if (groups.length === 0) {
        showInfo("No groups to view");
        return;
    }

    const { groupId } = await inquirer.prompt([
        {
            type: "list",
            name: "groupId",
            message: "Select group to view:",
            choices: groups.map((g) => ({
                name: `${g.name} (${g.addresses.length} addresses)`,
                value: g.id,
            })),
        },
    ]);

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    console.log(chalk.cyan(`\n📋 ${group.name} - ${group.addresses.length} addresses:\n`));

    const table = new Table({
        head: [chalk.cyan("#"), chalk.cyan("Address")],
        colWidths: [5, 50],
    });

    group.addresses.forEach((addr, i) => {
        table.push([(i + 1).toString(), addr]);
    });

    console.log(table.toString());
    await promptContinue();
}

async function editGroup(groups: AddressGroup[]): Promise<void> {
    if (groups.length === 0) {
        showInfo("No groups to edit");
        return;
    }

    const { groupId } = await inquirer.prompt([
        {
            type: "list",
            name: "groupId",
            message: "Select group to edit:",
            choices: groups.map((g) => ({
                name: `${g.name} (${g.addresses.length} addresses)`,
                value: g.id,
            })),
        },
    ]);

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const { editAction } = await inquirer.prompt([
        {
            type: "list",
            name: "editAction",
            message: "What to edit?",
            choices: [
                { name: "➕ Add addresses", value: "add" },
                { name: "🔄 Replace all addresses", value: "replace" },
            ],
        },
    ]);

    const { input } = await inquirer.prompt([
        {
            type: "input",
            name: "input",
            message: "Enter addresses (comma-separated or file.txt):",
        },
    ]);

    let newAddresses: string[] = [];
    const trimmed = input.trim();

    if (trimmed.endsWith(".txt")) {
        try {
            const fs = await import("fs");
            const content = fs.readFileSync(trimmed, "utf8");
            newAddresses = content
                .split("\n")
                .map((a: string) => a.trim())
                .filter((a: string) => a.length > 0);
        } catch {
            showError("Could not read file");
            return;
        }
    } else {
        newAddresses = trimmed
            .split(",")
            .map((a: string) => a.trim())
            .filter((a: string) => a.length > 0);
    }

    const { valid, invalid } = validateAddresses(newAddresses);

    if (invalid.length > 0) {
        showWarning(`${invalid.length} invalid addresses excluded`);
    }

    if (valid.length === 0) {
        showError("No valid addresses to add");
        return;
    }

    let finalAddresses: string[];
    if (editAction === "add") {
        finalAddresses = [...new Set([...group.addresses, ...valid])];
    } else {
        finalAddresses = valid;
    }

    updateAddressGroup(groupId, finalAddresses);
    showSuccess(`Updated "${group.name}" - now has ${finalAddresses.length} addresses`);
}

async function deleteGroup(groups: AddressGroup[]): Promise<void> {
    if (groups.length === 0) {
        showInfo("No groups to delete");
        return;
    }

    const { groupId } = await inquirer.prompt([
        {
            type: "list",
            name: "groupId",
            message: "Select group to delete:",
            choices: groups.map((g) => ({
                name: `${g.name} (${g.addresses.length} addresses)`,
                value: g.id,
            })),
        },
    ]);

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const confirmed = await promptConfirm(`Delete "${group.name}"?`);
    if (!confirmed) return;

    deleteAddressGroup(groupId);
    showSuccess(`Deleted "${group.name}"`);
}
