/**
 * Content Utilities - Activity content JSON handling
 */

import type { ActivityContentParsed } from "../types/index.js";

export function buildActivityContent(params: {
    description: string;
    address?: string;
    link?: string;
    startTime: Date;
    endTime: Date;
}): string {
    const content = {
        activityContentDescription: params.description,
        activityContentAddress: params.address || "",
        activityContentLink: params.link || "",
        eventStartTime: params.startTime.toISOString(),
        eventEndTime: params.endTime.toISOString(),
    };
    return JSON.stringify(content);
}

export function parseActivityContent(content: string): ActivityContentParsed {
    try {
        const parsed = JSON.parse(content);
        return {
            activityContentDescription: parsed.activityContentDescription,
            activityContentAddress: parsed.activityContentAddress,
            activityContentLink: parsed.activityContentLink,
            eventStartTime: parsed.eventStartTime,
            eventEndTime: parsed.eventEndTime,
        };
    } catch {
        return {
            activityContentDescription: content,
        };
    }
}

export function getActivityDescription(content: string): string {
    const parsed = parseActivityContent(content);
    return parsed.activityContentDescription || content;
}

export function getActivityAddress(content: string): string | undefined {
    const parsed = parseActivityContent(content);
    return parsed.activityContentAddress;
}

export function getActivityLink(content: string): string | undefined {
    const parsed = parseActivityContent(content);
    return parsed.activityContentLink;
}

export function getEventStartTime(content: string): Date | undefined {
    const parsed = parseActivityContent(content);
    if (parsed.eventStartTime) {
        return new Date(parsed.eventStartTime);
    }
    return undefined;
}

export function getEventEndTime(content: string): Date | undefined {
    const parsed = parseActivityContent(content);
    if (parsed.eventEndTime) {
        return new Date(parsed.eventEndTime);
    }
    return undefined;
}

export function buildLatitudeLongitude(lat: number, lng: number): string {
    return `${lat},${lng}`;
}

export function parseLatitudeLongitude(latLng: string): { lat: number; lng: number } | null {
    if (!latLng || !latLng.includes(",")) {
        return null;
    }
    
    const parts = latLng.split(",");
    if (parts.length !== 2) {
        return null;
    }
    
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    
    if (isNaN(lat) || isNaN(lng)) {
        return null;
    }
    
    return { lat, lng };
}

export function isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180;
}

export function formatCoordinates(lat: number, lng: number): string {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength - 3) + "...";
}

export function sanitizeInput(input: string): string {
    return input.trim().replace(/[\x00-\x1F\x7F]/g, "");
}

export function buildQRClaimData(params: {
    businessAccount?: string;
    activityId: number;
    recipientAddress: string;
    rewardAmount: string;
    tokenType: 1 | 2;
}): string {
    const data: Record<string, unknown> = {
        activity: params.activityId,
        address: params.recipientAddress,
        rewardAmt: params.rewardAmount,
        tokenType: params.tokenType,
    };
    
    if (params.businessAccount) {
        data.businessAccount = params.businessAccount;
    }
    
    return JSON.stringify(data);
}

export function parseQRClaimData(qrData: string): {
    businessAccount?: string;
    activity: number;
    address: string;
    rewardAmt: string;
    tokenType: 1 | 2;
} | null {
    try {
        const parsed = JSON.parse(qrData);
        if (!parsed.activity || !parsed.address || !parsed.rewardAmt || !parsed.tokenType) {
            return null;
        }
        return {
            businessAccount: parsed.businessAccount,
            activity: parsed.activity,
            address: parsed.address,
            rewardAmt: parsed.rewardAmt,
            tokenType: parsed.tokenType,
        };
    } catch {
        return null;
    }
}
