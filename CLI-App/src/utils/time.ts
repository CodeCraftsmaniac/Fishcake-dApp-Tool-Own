/**
 * Time Utilities - Date/time formatting and calculations
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(relativeTime);
dayjs.extend(duration);

export function unixToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
}

export function dateToUnix(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

export function nowUnix(): number {
    return Math.floor(Date.now() / 1000);
}

export function formatDate(timestamp: number): string {
    return dayjs.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");
}

export function formatDateShort(timestamp: number): string {
    return dayjs.unix(timestamp).format("MMM D, YYYY");
}

export function formatDateTime(timestamp: number): string {
    return dayjs.unix(timestamp).format("MMM D, YYYY h:mm A");
}

export function formatDateISO(date: Date): string {
    return date.toISOString();
}

export function parseISODate(isoString: string): Date {
    return new Date(isoString);
}

export function isExpired(deadline: number): boolean {
    return deadline < nowUnix();
}

export function isActive(deadline: number): boolean {
    return deadline > nowUnix();
}

export function timeRemaining(deadline: number): string {
    const now = nowUnix();
    if (deadline <= now) {
        return "Expired";
    }
    
    const diffSeconds = deadline - now;
    const d = dayjs.duration(diffSeconds, "seconds");
    
    if (d.asDays() >= 1) {
        const days = Math.floor(d.asDays());
        const hours = d.hours();
        return `${days}d ${hours}h`;
    }
    
    if (d.asHours() >= 1) {
        const hours = Math.floor(d.asHours());
        const minutes = d.minutes();
        return `${hours}h ${minutes}m`;
    }
    
    const minutes = Math.floor(d.asMinutes());
    return `${minutes}m`;
}

export function timeRemainingLong(deadline: number): string {
    const now = nowUnix();
    if (deadline <= now) {
        return "Expired";
    }
    
    const diffSeconds = deadline - now;
    const d = dayjs.duration(diffSeconds, "seconds");
    
    const days = Math.floor(d.asDays());
    const hours = d.hours();
    const minutes = d.minutes();
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    
    return parts.join(", ") || "< 1 minute";
}

export function timeSince(timestamp: number): string {
    return dayjs.unix(timestamp).fromNow();
}

export function timeSinceShort(timestamp: number): string {
    const now = nowUnix();
    const diffSeconds = now - timestamp;
    
    if (diffSeconds < 60) return "just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`;
    
    return dayjs.unix(timestamp).format("MMM D");
}

export function addDays(days: number): number {
    return nowUnix() + (days * 24 * 60 * 60);
}

export function addHours(hours: number): number {
    return nowUnix() + (hours * 60 * 60);
}

export function daysUntil(deadline: number): number {
    const now = nowUnix();
    if (deadline <= now) return 0;
    return Math.ceil((deadline - now) / 86400);
}

export function isWithin24Hours(timestamp: number): boolean {
    const diff = Math.abs(nowUnix() - timestamp);
    return diff < 86400;
}

export function getStartOfDay(date?: Date): number {
    const d = date ? dayjs(date) : dayjs();
    return d.startOf("day").unix();
}

export function getEndOfDay(date?: Date): number {
    const d = date ? dayjs(date) : dayjs();
    return d.endOf("day").unix();
}

export function getCurrentMonth(): string {
    return dayjs().format("YYYY-MM");
}

export function formatDuration(seconds: number): string {
    const d = dayjs.duration(seconds, "seconds");
    
    if (d.asDays() >= 1) {
        return `${Math.floor(d.asDays())} days`;
    }
    if (d.asHours() >= 1) {
        return `${Math.floor(d.asHours())} hours`;
    }
    return `${Math.floor(d.asMinutes())} minutes`;
}
