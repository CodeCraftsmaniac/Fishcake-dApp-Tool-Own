/**
 * Default Configuration - Quick Workflow Defaults
 * Hardcoded defaults for faster workflow
 */

// Default Location: West Sulawesi, Indonesia
export const DEFAULT_LOCATION = {
    name: "West Sulawesi, Indonesia",
    latitude: -2.4977213,
    longitude: 119.2473778,
    timezone: "Asia/Makassar",
    locale: "id-ID",
} as const;

// Quick Airdrop Templates
export const QUICK_AIRDROP_TEMPLATES = {
    standard: {
        name: "Standard Drop (12 FCC × 2)",
        amountPerDrop: 12,
        dropNumber: 2,
        totalBudget: 24,
        token: "FCC" as const,
    },
    small: {
        name: "Small Drop (5 FCC × 5)",
        amountPerDrop: 5,
        dropNumber: 5,
        totalBudget: 25,
        token: "FCC" as const,
    },
    medium: {
        name: "Medium Drop (25 FCC × 4)",
        amountPerDrop: 25,
        dropNumber: 4,
        totalBudget: 100,
        token: "FCC" as const,
    },
} as const;

// NFT Mint Templates (5 templates)
export const NFT_TEMPLATES = {
    basic: [
        {
            id: "cafe",
            name: "☕ Cozy Cafe",
            businessName: "Sunrise Coffee House",
            description: "Your neighborhood specialty coffee shop serving artisan brews and fresh pastries daily.",
            social: "https://twitter.com/sunrisecoffee",
        },
        {
            id: "restaurant",
            name: "🍜 Restaurant",
            businessName: "Golden Dragon Kitchen",
            description: "Authentic Asian fusion cuisine with a modern twist. Family recipes passed down generations.",
            social: "https://instagram.com/goldendragonkitchen",
        },
        {
            id: "shop",
            name: "🛍️ Retail Shop",
            businessName: "Urban Style Boutique",
            description: "Trendy fashion and accessories for the modern lifestyle. Quality meets affordability.",
            social: "https://twitter.com/urbanstyle",
        },
        {
            id: "fitness",
            name: "💪 Fitness Center",
            businessName: "Peak Performance Gym",
            description: "State-of-the-art fitness facility with personal training and group classes for all levels.",
            social: "https://instagram.com/peakperformancegym",
        },
        {
            id: "salon",
            name: "💇 Beauty Salon",
            businessName: "Glamour Studio",
            description: "Premium hair styling, spa treatments, and beauty services by certified professionals.",
            social: "https://twitter.com/glamourstudio",
        },
    ],
    pro: [
        {
            id: "tech",
            name: "💻 Tech Company",
            businessName: "InnovateTech Solutions",
            description: "Leading software development and IT consulting firm delivering cutting-edge solutions.",
            businessAddress: "Jl. Sudirman No. 45, Jakarta Pusat, Indonesia",
            webSite: "https://innovatetech.io",
            social: "https://linkedin.com/company/innovatetech",
        },
        {
            id: "hotel",
            name: "🏨 Hotel & Resort",
            businessName: "Paradise Beach Resort",
            description: "Luxury beachfront accommodation with world-class amenities and breathtaking ocean views.",
            businessAddress: "Jl. Pantai Kuta No. 88, Bali, Indonesia",
            webSite: "https://paradisebeachresort.com",
            social: "https://instagram.com/paradisebeach",
        },
        {
            id: "clinic",
            name: "🏥 Medical Clinic",
            businessName: "HealthFirst Medical Center",
            description: "Comprehensive healthcare services with experienced doctors and modern diagnostic equipment.",
            businessAddress: "Jl. Gatot Subroto No. 12, Makassar, Indonesia",
            webSite: "https://healthfirstclinic.id",
            social: "https://twitter.com/healthfirstid",
        },
        {
            id: "agency",
            name: "📱 Digital Agency",
            businessName: "CreativePixel Agency",
            description: "Full-service digital marketing agency specializing in branding, web design, and social media.",
            businessAddress: "Jl. Kemang Raya No. 77, Jakarta Selatan, Indonesia",
            webSite: "https://creativepixel.agency",
            social: "https://linkedin.com/company/creativepixel",
        },
        {
            id: "realestate",
            name: "🏢 Real Estate",
            businessName: "Prime Properties Indonesia",
            description: "Premier real estate agency offering residential and commercial properties across Indonesia.",
            businessAddress: "Jl. HR Rasuna Said No. 55, Jakarta, Indonesia",
            webSite: "https://primeproperties.id",
            social: "https://instagram.com/primepropertiesid",
        },
    ],
} as const;

// Human-like Event Names Generator
export const EVENT_NAME_TEMPLATES = [
    "Grand Opening Celebration 🎉",
    "Customer Appreciation Day ❤️",
    "Weekly Lucky Draw 🍀",
    "Flash Sale Rewards 🔥",
    "VIP Members Exclusive 👑",
    "Community Giveaway 🎁",
    "Anniversary Special 🎂",
    "Happy Hour Bonus ⏰",
    "New Customer Welcome 🌟",
    "Loyalty Rewards Drop 💎",
    "Weekend Special Treat 🌈",
    "Social Media Followers Gift 📱",
    "First 100 Customers Reward 🥇",
    "Season Festival Bonus 🎊",
    "Partner Collaboration Event 🤝",
    "Thank You Loyal Fans ✨",
    "Midnight Madness Sale 🌙",
    "Early Bird Special 🐦",
    "Bundle Deal Celebration 📦",
    "Crypto Community Drop 🚀",
    "NFT Holder Exclusive 🖼️",
    "Referral Bonus Event 👥",
    "Birthday Month Special 🎈",
    "Holiday Season Gift 🎄",
    "Back to Business Drop 💼",
    "Summer Vibes Giveaway ☀️",
    "Rainy Day Surprise 🌧️",
    "Monthly Member Rewards 📅",
    "Surprise Flash Drop ⚡",
    "End of Month Bonus 💰",
];

// Human-like Event Descriptions Generator
export const EVENT_DESCRIPTION_TEMPLATES = [
    "Join our special celebration! We're rewarding our amazing community with FCC tokens. Thank you for your support!",
    "As a token of appreciation for being part of our journey, we're dropping rewards to our loyal customers.",
    "Exclusive rewards for our valued members. Claim your FCC tokens and enjoy the benefits of being with us!",
    "We're celebrating a milestone! Get your share of FCC tokens as we thank everyone who made this possible.",
    "Special promotion just for you! Don't miss out on these limited FCC token rewards.",
    "Our way of saying thank you. Enjoy these FCC tokens as a gift from our team to yours.",
    "Exciting giveaway alert! Participate and receive FCC tokens directly to your wallet.",
    "Community appreciation event - Because you matter to us. Claim your FCC reward now!",
    "Limited time offer! We're distributing FCC tokens to celebrate our growing community.",
    "You've been selected for this exclusive drop. Thank you for being an amazing supporter!",
    "Flash event! Quick rewards for quick actions. Grab your FCC tokens while supplies last.",
    "Special recognition for our community members. Your support means everything to us!",
    "Celebration time! We're sharing the joy with FCC tokens for our incredible followers.",
    "Exclusive member benefit - Get your FCC tokens as part of our loyalty program.",
    "Thank you for choosing us! Here's a small token of our appreciation.",
];

// Business Name Prefixes for Random Generation
export const BUSINESS_PREFIXES = [
    "Golden", "Silver", "Royal", "Prime", "Elite", "Star", "Sunrise", "Crystal",
    "Diamond", "Pearl", "Ruby", "Emerald", "Jade", "Sapphire", "Ocean", "Mountain",
    "Valley", "Garden", "Paradise", "Harmony", "Unity", "Fortune", "Lucky", "Happy",
    "Bright", "Sunny", "Blue", "Green", "Red", "White", "Black", "Urban", "Metro",
];

export const BUSINESS_SUFFIXES = [
    "Shop", "Store", "Mart", "Hub", "Center", "Place", "Corner", "Point",
    "Zone", "House", "Studio", "Lab", "Works", "Co", "Group", "Team",
    "Space", "Spot", "Lounge", "Club", "Cafe", "Kitchen", "Garden", "Plaza",
];

/**
 * Generate a random human-like event name
 */
export function generateRandomEventName(): string {
    const index = Math.floor(Math.random() * EVENT_NAME_TEMPLATES.length);
    return EVENT_NAME_TEMPLATES[index];
}

/**
 * Generate a random human-like event description
 */
export function generateRandomEventDescription(): string {
    const index = Math.floor(Math.random() * EVENT_DESCRIPTION_TEMPLATES.length);
    return EVENT_DESCRIPTION_TEMPLATES[index];
}

/**
 * Generate a random business name
 */
export function generateRandomBusinessName(): string {
    const prefix = BUSINESS_PREFIXES[Math.floor(Math.random() * BUSINESS_PREFIXES.length)];
    const suffix = BUSINESS_SUFFIXES[Math.floor(Math.random() * BUSINESS_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
}

/**
 * Generate event deadline (random 3-30 days from now)
 */
export function generateRandomDeadline(): Date {
    const daysFromNow = Math.floor(Math.random() * 28) + 3; // 3-30 days
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysFromNow);
    deadline.setHours(23, 59, 59, 0);
    return deadline;
}
