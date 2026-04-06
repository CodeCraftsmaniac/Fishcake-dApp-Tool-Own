/**
 * CLI Prompts - All Inquirer prompts
 */

import inquirer from "inquirer";
import { validateAddress, validateLatLng, validateEventId } from "../utils/validate.js";
import { parseUserAmount, parseEventId } from "../utils/format.js";

export async function promptMainMenu(): Promise<string> {
    const { choice } = await inquirer.prompt([
        {
            type: "input",
            name: "choice",
            message: "Select option:",
            validate: (input: string) => {
                const trimmed = input.trim().toLowerCase();
                // Accept Q, A, W for quick actions
                if (["q", "a", "w"].includes(trimmed)) {
                    return true;
                }
                const num = parseInt(input, 10);
                if (isNaN(num) || num < 0 || num > 15) {
                    return "Enter 0-15, Q, A, or W";
                }
                return true;
            },
        },
    ]);
    return choice.trim().toLowerCase();
}

export async function promptPrivateKey(): Promise<string> {
    const { privateKey } = await inquirer.prompt([
        {
            type: "password",
            name: "privateKey",
            message: "Enter your private key:",
            mask: "*",
            validate: (input: string) => {
                const clean = input.startsWith("0x") ? input.slice(2) : input;
                if (clean.length !== 64 || !/^[0-9a-fA-F]+$/.test(clean)) {
                    return "Invalid private key format";
                }
                return true;
            },
        },
    ]);
    return privateKey;
}

export async function promptPassphrase(confirm: boolean = false): Promise<string> {
    const { passphrase } = await inquirer.prompt([
        {
            type: "password",
            name: "passphrase",
            message: "Enter passphrase:",
            mask: "*",
            validate: (input: string) => {
                if (input.length < 6) {
                    return "Passphrase must be at least 6 characters";
                }
                return true;
            },
        },
    ]);
    
    if (confirm) {
        const { confirmPass } = await inquirer.prompt([
            {
                type: "password",
                name: "confirmPass",
                message: "Confirm passphrase:",
                mask: "*",
            },
        ]);
        
        if (passphrase !== confirmPass) {
            throw new Error("Passphrases do not match");
        }
    }
    
    return passphrase;
}

export async function promptMnemonic(): Promise<string> {
    const { mnemonic } = await inquirer.prompt([
        {
            type: "password",
            name: "mnemonic",
            message: "Enter your mnemonic phrase (12, 15, 18, 21, or 24 words):",
            mask: "*",
            validate: (input: string) => {
                const words = input.trim().split(/\s+/);
                const validCounts = [12, 15, 18, 21, 24];
                if (!validCounts.includes(words.length)) {
                    return `Invalid mnemonic: expected 12, 15, 18, 21, or 24 words, got ${words.length}`;
                }
                return true;
            },
        },
    ]);
    return mnemonic.trim();
}

export async function promptWalletSetupChoice(): Promise<"privateKey" | "mnemonic" | "generate"> {
    const { choice } = await inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message: "How would you like to set up your wallet?",
            choices: [
                { name: "Import Private Key (64 hex characters)", value: "privateKey" },
                { name: "Import Mnemonic Phrase (12-24 words)", value: "mnemonic" },
                { name: "Generate New Wallet (creates new mnemonic)", value: "generate" },
            ],
        },
    ]);
    return choice;
}

export async function promptConfirmMnemonic(mnemonic: string): Promise<boolean> {
    // Show mnemonic to user
    console.log("\n⚠️  IMPORTANT: Write down these words and store them safely!\n");
    console.log("═══════════════════════════════════════════════════════════");
    
    const words = mnemonic.split(" ");
    for (let i = 0; i < words.length; i += 4) {
        const row = words.slice(i, i + 4)
            .map((w, j) => `${(i + j + 1).toString().padStart(2, " ")}. ${w.padEnd(12)}`)
            .join("  ");
        console.log(row);
    }
    
    console.log("═══════════════════════════════════════════════════════════\n");
    console.log("⚠️  Never share your mnemonic! Anyone with these words can steal your funds.\n");
    
    const { confirm1 } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirm1",
            message: "Have you written down your mnemonic phrase?",
            default: false,
        },
    ]);
    
    if (!confirm1) return false;
    
    // Verify by asking for random words
    const randomIndices = getRandomIndices(3, words.length);
    
    for (const idx of randomIndices) {
        const { word } = await inquirer.prompt([
            {
                type: "input",
                name: "word",
                message: `Enter word #${idx + 1}:`,
            },
        ]);
        
        if (word.trim().toLowerCase() !== words[idx].toLowerCase()) {
            console.log(`❌ Incorrect! Word #${idx + 1} was "${words[idx]}"`);
            return false;
        }
    }
    
    return true;
}

function getRandomIndices(count: number, max: number): number[] {
    const indices: number[] = [];
    while (indices.length < count) {
        const idx = Math.floor(Math.random() * max);
        if (!indices.includes(idx)) {
            indices.push(idx);
        }
    }
    return indices.sort((a, b) => a - b);
}

export async function promptEventId(): Promise<number> {
    const { eventId } = await inquirer.prompt([
        {
            type: "input",
            name: "eventId",
            message: "Enter Event ID:",
            validate: (input: string) => {
                const id = parseEventId(input);
                if (id === null) {
                    return "Please enter a valid event ID (positive number)";
                }
                return true;
            },
        },
    ]);
    return parseEventId(eventId)!;
}

export async function promptAddress(message: string = "Enter wallet address:"): Promise<string> {
    const { address } = await inquirer.prompt([
        {
            type: "input",
            name: "address",
            message,
            validate: (input: string) => {
                if (!validateAddress(input.trim())) {
                    return "Invalid Ethereum address";
                }
                return true;
            },
        },
    ]);
    return address.trim();
}

export async function promptAmount(message: string, min?: number, max?: number): Promise<number> {
    const { amount } = await inquirer.prompt([
        {
            type: "input",
            name: "amount",
            message,
            validate: (input: string) => {
                const parsed = parseUserAmount(input);
                if (parsed === null) {
                    return "Please enter a valid positive number";
                }
                if (min !== undefined && parsed < min) {
                    return `Amount must be at least ${min}`;
                }
                if (max !== undefined && parsed > max) {
                    return `Amount cannot exceed ${max}`;
                }
                return true;
            },
        },
    ]);
    return parseUserAmount(amount)!;
}

export async function promptConfirm(message: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirmed",
            message,
            default: false,
        },
    ]);
    return confirmed;
}

export async function promptChoice<T extends string>(
    message: string,
    choices: { name: string; value: T }[]
): Promise<T> {
    const { choice } = await inquirer.prompt([
        {
            type: "list",
            name: "choice",
            message,
            choices,
        },
    ]);
    return choice;
}

export async function promptCreateEvent(): Promise<{
    businessName: string;
    description: string;
    address: string;
    link: string;
    latitude: number;
    longitude: number;
    startTime: Date;
    endTime: Date;
    token: "FCC" | "USDT";
    dropType: 1 | 2;
    minDropAmt: number;
    maxDropAmt: number;
    dropNumber: number;
}> {
    // Default location: West Sulawesi, Indonesia
    const DEFAULT_LAT = -2.4977213;
    const DEFAULT_LNG = 119.2473778;
    
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "businessName",
            message: "Campaign Name:",
            validate: (input: string) => input.trim().length > 0 || "Required",
        },
        {
            type: "input",
            name: "description",
            message: "Description:",
            validate: (input: string) => input.trim().length > 0 || "Required",
        },
        {
            type: "input",
            name: "address",
            message: "Physical Address (optional):",
            default: "West Sulawesi, Indonesia",
        },
        {
            type: "input",
            name: "link",
            message: "Link/URL (optional):",
        },
        {
            type: "input",
            name: "endTime",
            message: "End Time / Deadline (YYYY-MM-DD HH:MM or days like '7d'):",
            default: "7d",
            validate: (input: string) => {
                // Accept "Xd" format for days
                if (/^\d+d$/i.test(input.trim())) {
                    return true;
                }
                const date = new Date(input);
                if (isNaN(date.getTime())) {
                    return "Invalid format. Use YYYY-MM-DD HH:MM or Xd (e.g., 7d)";
                }
                if (date <= new Date()) {
                    return "End time must be in the future";
                }
                return true;
            },
        },
        {
            type: "list",
            name: "token",
            message: "Token:",
            choices: [
                { name: "🍥 FCC", value: "FCC" },
                { name: "💲 USDT", value: "USDT" },
            ],
        },
        {
            type: "input",
            name: "dropAmt",
            message: "Drop Amount (per person):",
            default: "12",
            validate: (input: string) => {
                const num = parseUserAmount(input);
                return (num !== null && num > 0) || "Must be a positive number";
            },
        },
        {
            type: "input",
            name: "dropNumber",
            message: "Number of Drops:",
            default: "2",
            validate: (input: string) => {
                const num = parseInt(input, 10);
                return (num > 0 && num <= 10000) || "Must be between 1 and 10000";
            },
        },
    ]);
    
    // Parse end time
    let endTime: Date;
    const endInput = answers.endTime.trim();
    if (/^\d+d$/i.test(endInput)) {
        const days = parseInt(endInput, 10);
        endTime = new Date();
        endTime.setDate(endTime.getDate() + days);
        endTime.setHours(23, 59, 59, 0);
    } else {
        endTime = new Date(answers.endTime);
    }
    
    const dropAmt = parseUserAmount(answers.dropAmt)!;
    
    return {
        businessName: answers.businessName.trim(),
        description: answers.description.trim(),
        address: answers.address?.trim() || "",
        link: answers.link?.trim() || "",
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        startTime: new Date(),
        endTime,
        token: answers.token,
        dropType: 1, // Always EVEN
        minDropAmt: dropAmt,
        maxDropAmt: dropAmt,
        dropNumber: parseInt(answers.dropNumber, 10),
    };
}

export async function promptDropHistory(): Promise<{
    type: "received" | "sent";
    sort: "newest" | "oldest";
}> {
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "type",
            message: "Show:",
            choices: [
                { name: "Received drops", value: "received" },
                { name: "Sent drops", value: "sent" },
            ],
        },
        {
            type: "list",
            name: "sort",
            message: "Sort:",
            choices: [
                { name: "Newest first", value: "newest" },
                { name: "Oldest first", value: "oldest" },
            ],
        },
    ]);
    return answers;
}

export async function promptBuyFCC(): Promise<{
    direction: "usdt-to-fcc" | "fcc-to-usdt";
    amount: number;
}> {
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "direction",
            message: "Direction:",
            choices: [
                { name: "USDT → FCC (buy FCC)", value: "usdt-to-fcc" },
                { name: "FCC → USDT (sell FCC)", value: "fcc-to-usdt" },
            ],
        },
        {
            type: "input",
            name: "amount",
            message: (answers: any) =>
                answers.direction === "usdt-to-fcc"
                    ? "USDT amount to spend:"
                    : "FCC amount to sell:",
            validate: (input: string) => {
                const num = parseUserAmount(input);
                return (num !== null && num > 0) || "Must be a positive number";
            },
        },
    ]);
    
    return {
        direction: answers.direction,
        amount: parseUserAmount(answers.amount)!,
    };
}

export async function promptMintNFT(type: "basic" | "pro"): Promise<{
    businessName: string;
    description: string;
    businessAddress?: string;
    webSite?: string;
    social: string;
}> {
    const questions: any[] = [
        {
            type: "input",
            name: "businessName",
            message: "Business Name:",
            validate: (input: string) => input.trim().length > 0 || "Required",
        },
        {
            type: "input",
            name: "description",
            message: "Description:",
            validate: (input: string) => input.trim().length > 0 || "Required",
        },
    ];
    
    if (type === "pro") {
        questions.push(
            {
                type: "input",
                name: "businessAddress",
                message: "Business Address:",
                validate: (input: string) => input.trim().length > 0 || "Required for Pro NFT",
            },
            {
                type: "input",
                name: "webSite",
                message: "Website:",
                validate: (input: string) => input.trim().length > 0 || "Required for Pro NFT",
            }
        );
    }
    
    questions.push({
        type: "input",
        name: "social",
        message: "Social Link:",
        validate: (input: string) => input.trim().length > 0 || "Required",
    });
    
    const answers = await inquirer.prompt(questions);
    
    return {
        businessName: answers.businessName.trim(),
        description: answers.description.trim(),
        businessAddress: answers.businessAddress?.trim(),
        webSite: answers.webSite?.trim(),
        social: answers.social.trim(),
    };
}

export async function promptBatchAddresses(): Promise<string[]> {
    const { input } = await inquirer.prompt([
        {
            type: "input",
            name: "input",
            message: "Enter addresses (comma-separated) or file path (.txt):",
        },
    ]);
    
    const trimmed = input.trim();
    
    if (trimmed.endsWith(".txt")) {
        const fs = await import("fs");
        const content = fs.readFileSync(trimmed, "utf8");
        return content.split("\n").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
    }
    
    return trimmed.split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
}

export async function promptBrowseFilters(): Promise<{
    status: "all" | "ongoing" | "ended";
    token: "all" | "FCC" | "USDT";
    search: string;
}> {
    const answers = await inquirer.prompt([
        {
            type: "list",
            name: "status",
            message: "Status:",
            choices: [
                { name: "All", value: "all" },
                { name: "Ongoing", value: "ongoing" },
                { name: "Ended", value: "ended" },
            ],
        },
        {
            type: "list",
            name: "token",
            message: "Token:",
            choices: [
                { name: "All", value: "all" },
                { name: "FCC only", value: "FCC" },
                { name: "USDT only", value: "USDT" },
            ],
        },
        {
            type: "input",
            name: "search",
            message: "Search (name or ID, leave empty for all):",
        },
    ]);
    
    return {
        status: answers.status,
        token: answers.token,
        search: answers.search.trim(),
    };
}

export async function promptContinue(): Promise<void> {
    await inquirer.prompt([
        {
            type: "input",
            name: "continue",
            message: "Press Enter to continue...",
        },
    ]);
}
