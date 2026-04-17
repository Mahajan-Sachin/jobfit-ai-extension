// JobFit AI – Background Service Worker (Manifest V3)
// Handles messages from content scripts if needed in future.

console.log("[JobFit AI] Background service worker started.");

// Reset daily usage count at midnight
chrome.alarms.create("dailyReset", { when: getNextMidnight(), periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyReset") {
        chrome.storage.local.remove("usageData", () => {
            console.log("[JobFit AI] Daily usage reset at midnight.");
        });
    }
});

function getNextMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
}