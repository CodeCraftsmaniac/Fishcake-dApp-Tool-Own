/**
 * Address Book - Save and manage recipient addresses
 * Persists to ~/.fishcake-cli/address-book.json
 */

import fs from "fs";
import path from "path";
import os from "os";

const CACHE_DIR = path.join(os.homedir(), ".fishcake-cli");
const ADDRESS_BOOK_FILE = path.join(CACHE_DIR, "address-book.json");

export interface AddressEntry {
    address: string;
    label?: string;
    createdAt?: string;
}

export interface AddressGroup {
    id: string;
    name: string;
    addresses: string[];
    createdAt: string;
    lastUsed?: string;
}

export interface AddressBookData {
    groups: AddressGroup[];
    recentAddresses: string[];
    entries?: AddressEntry[];
}

function ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

export function loadAddressBook(): AddressBookData {
    try {
        if (!fs.existsSync(ADDRESS_BOOK_FILE)) {
            return { groups: [], recentAddresses: [] };
        }
        const data = fs.readFileSync(ADDRESS_BOOK_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return { groups: [], recentAddresses: [] };
    }
}

export function saveAddressBook(data: AddressBookData): void {
    ensureCacheDir();
    fs.writeFileSync(ADDRESS_BOOK_FILE, JSON.stringify(data, null, 2));
}

export function addAddressGroup(name: string, addresses: string[]): AddressGroup {
    const book = loadAddressBook();
    const id = `group-${Date.now()}`;
    const group: AddressGroup = {
        id,
        name,
        addresses: addresses.filter(a => a.length > 0),
        createdAt: new Date().toISOString(),
    };
    book.groups.push(group);
    saveAddressBook(book);
    return group;
}

export function updateAddressGroup(id: string, addresses: string[]): boolean {
    const book = loadAddressBook();
    const group = book.groups.find(g => g.id === id);
    if (!group) return false;
    
    group.addresses = addresses.filter(a => a.length > 0);
    group.lastUsed = new Date().toISOString();
    saveAddressBook(book);
    return true;
}

export function deleteAddressGroup(id: string): boolean {
    const book = loadAddressBook();
    const index = book.groups.findIndex(g => g.id === id);
    if (index === -1) return false;
    
    book.groups.splice(index, 1);
    saveAddressBook(book);
    return true;
}

export function getAddressGroups(): AddressGroup[] {
    return loadAddressBook().groups;
}

export function getAddressGroup(id: string): AddressGroup | null {
    const book = loadAddressBook();
    return book.groups.find(g => g.id === id) || null;
}

export function addRecentAddresses(addresses: string[]): void {
    const book = loadAddressBook();
    const newRecent = [...new Set([...addresses, ...book.recentAddresses])].slice(0, 50);
    book.recentAddresses = newRecent;
    saveAddressBook(book);
}

export function getRecentAddresses(limit: number = 10): string[] {
    return loadAddressBook().recentAddresses.slice(0, limit);
}

export function clearAddressBook(): void {
    saveAddressBook({ groups: [], recentAddresses: [], entries: [] });
}

// Simple entry-based interface for UI compatibility
export function getEntries(): AddressEntry[] {
    const book = loadAddressBook();
    return book.entries || [];
}

export function addAddress(address: string, label?: string): void {
    const book = loadAddressBook();
    if (!book.entries) {
        book.entries = [];
    }
    
    // Check if already exists
    if (book.entries.find(e => e.address.toLowerCase() === address.toLowerCase())) {
        return;
    }
    
    book.entries.push({
        address,
        label,
        createdAt: new Date().toISOString(),
    });
    saveAddressBook(book);
}

export function removeAddress(address: string): void {
    const book = loadAddressBook();
    if (!book.entries) return;
    
    book.entries = book.entries.filter(e => e.address.toLowerCase() !== address.toLowerCase());
    saveAddressBook(book);
}

export function updateAddress(address: string, label: string): void {
    const book = loadAddressBook();
    if (!book.entries) return;
    
    const entry = book.entries.find(e => e.address.toLowerCase() === address.toLowerCase());
    if (entry) {
        entry.label = label;
        saveAddressBook(book);
    }
}

// Alias for backward compatibility - returns entries as array
export function getAllAddresses(): AddressEntry[] {
    return getEntries();
}

