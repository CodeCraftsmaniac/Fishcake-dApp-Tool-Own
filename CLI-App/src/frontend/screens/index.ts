/**
 * Screens Index - Re-exports all UI screens
 * 
 * Each screen module contains ONLY UI code (prompts, display).
 * All business logic is delegated to the services layer.
 */

// Event management screens
export { eventScreens } from "./eventScreens.js";
export {
    eventDetailScreen,
    myEventsScreen,
    createEventScreen,
    finishEventScreen,
} from "./eventScreens.js";

// Drop operation screens
export { dropScreens } from "./dropScreens.js";
export {
    quickAirdropScreen,
    batchDropScreen,
    singleDropScreen,
    dropHistoryScreen,
    powerUserScreen,
} from "./dropScreens.js";

// Swap screens
export { swapScreens } from "./swapScreens.js";
export {
    buyFCCScreen,
    sellFCCScreen,
} from "./swapScreens.js";

// NFT screens
export { nftScreens } from "./nftScreens.js";
export {
    nftStatusScreen,
    mintNFTScreen,
} from "./nftScreens.js";

// Wallet screens
export { walletScreens } from "./walletScreens.js";
export {
    listWalletsScreen,
    importWalletScreen,
    batchImportScreen,
    switchWalletScreen,
    deleteWalletScreen,
    logoutScreen,
} from "./walletScreens.js";

// Address book screens
export { addressBookScreens } from "./addressBookScreens.js";
export {
    viewAddressBookScreen,
    addAddressScreen,
    batchAddAddressScreen,
    removeAddressScreen,
    editAddressScreen,
    clearAddressBookScreen,
    addressBookMenuScreen,
} from "./addressBookScreens.js";
