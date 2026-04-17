// ─────────────────────────────────────────────────────────────
//  JobFit AI – popup.js
//  Handles: profile setup, rate limiting, UI state management
// ─────────────────────────────────────────────────────────────

const API_BASE_URL = "https://jobfit-ai-extension.vercel.app";
const DAILY_LIMIT  = 20;

// ── DOM refs ──────────────────────────────────────────────────
const screenSetup   = document.getElementById("screen-setup");
const screenProfile = document.getElementById("screen-profile");
const screenLimit   = document.getElementById("screen-limit");

const resumeInput   = document.getElementById("resume-input");
const charCount     = document.getElementById("char-count");
const saveBtn       = document.getElementById("save-btn");
const saveBtnText   = document.getElementById("save-btn-text");
const saveSpinner   = document.getElementById("save-spinner");
const statusMsg     = document.getElementById("status-msg");
const resetBtn      = document.getElementById("reset-btn");
const waitlistBtn   = document.getElementById("waitlist-btn");
const usageBadge    = document.getElementById("usage-badge");

const savedExp      = document.getElementById("saved-exp");
const skillCount    = document.getElementById("skill-count");
const skillsChips   = document.getElementById("skills-chips");
const profileUpdated = document.getElementById("profile-updated");
const resetTimer    = document.getElementById("reset-timer");

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await updateUsageBadge();
    await checkExistingProfile();

    // Char counter
    resumeInput.addEventListener("input", () => {
        charCount.textContent = `${resumeInput.value.length.toLocaleString()} characters`;
    });

    saveBtn.addEventListener("click", handleSave);
    resetBtn.addEventListener("click", handleReset);
    waitlistBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: "https://forms.gle/YourWaitlistFormLink" }); // replace with real link
    });
});

// ── Rate Limiting ─────────────────────────────────────────────
async function getUsageData() {
    return new Promise(resolve => {
        chrome.storage.local.get("usageData", ({ usageData }) => {
            const today = new Date().toDateString();
            if (!usageData || usageData.date !== today) {
                resolve({ date: today, count: 0, timestamps: [] });
            } else {
                resolve(usageData);
            }
        });
    });
}

async function incrementUsage() {
    const usage = await getUsageData();
    usage.count += 1;
    usage.timestamps.push(Date.now());
    await chrome.storage.local.set({ usageData: usage });
    return usage.count;
}

async function getRemainingAnalyses() {
    const usage = await getUsageData();
    return DAILY_LIMIT - usage.count;
}

async function updateUsageBadge() {
    const remaining = await getRemainingAnalyses();
    usageBadge.textContent = `${remaining}/${DAILY_LIMIT} left`;
    usageBadge.className = "usage-badge";
    if (remaining <= 5 && remaining > 0) usageBadge.classList.add("warning");
    if (remaining === 0) usageBadge.classList.add("danger");
}

// ── Profile Check ─────────────────────────────────────────────
async function checkExistingProfile() {
    const remaining = await getRemainingAnalyses();
    if (remaining === 0) {
        showScreen("limit");
        showResetCountdown();
        return;
    }

    chrome.storage.local.get("userProfile", ({ userProfile }) => {
        if (userProfile && userProfile.skills && userProfile.skills.length > 0) {
            showScreen("profile");
            renderProfile(userProfile);
        } else {
            showScreen("setup");
        }
    });
}

// ── Save Profile ──────────────────────────────────────────────
async function handleSave() {
    const text = resumeInput.value.trim();
    if (!text || text.length < 50) {
        setStatus("Please paste a more detailed resume (at least 50 characters).", "error");
        return;
    }

    const remaining = await getRemainingAnalyses();
    if (remaining === 0) {
        showScreen("limit");
        showResetCountdown();
        return;
    }

    setLoading(true);
    setStatus("Analyzing your resume with AI...", "info");

    try {
        const response = await fetch(`${API_BASE_URL}/api/extract-skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.skills || !Array.isArray(data.skills)) {
            throw new Error("Invalid response from API. Try again.");
        }

        // Strip PII just in case (extra safety layer)
        const cleanText = text
            .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email]")
            .replace(/(\+91[\-\s]?)?[6-9]\d{9}/g, "[phone]")
            .replace(/https?:\/\/\S+/g, "[link]");

        const profile = {
            skills: data.skills,
            experienceYears: data.experience_years ?? 0,
            lastUpdated: new Date().toISOString()
        };

        await chrome.storage.local.set({ userProfile: profile });
        await incrementUsage();
        await updateUsageBadge();

        setStatus("Profile saved!", "success");
        setTimeout(() => {
            showScreen("profile");
            renderProfile(profile);
        }, 800);

    } catch (error) {
        console.error("[JobFit AI] Save error:", error);
        setStatus(`Error: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
}

// ── Reset Profile ─────────────────────────────────────────────
function handleReset() {
    chrome.storage.local.remove("userProfile", () => {
        showScreen("setup");
        resumeInput.value = "";
        charCount.textContent = "0 characters";
        setStatus("", "");
    });
}

// ── Render Profile Card ───────────────────────────────────────
function renderProfile(profile) {
    savedExp.textContent    = parseFloat(profile.experienceYears || 0).toFixed(1);
    skillCount.textContent  = profile.skills.length;

    skillsChips.innerHTML = "";
    profile.skills.slice(0, 20).forEach(skill => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = skill;
        skillsChips.appendChild(chip);
    });

    if (profile.skills.length > 20) {
        const more = document.createElement("span");
        more.className = "chip";
        more.textContent = `+${profile.skills.length - 20} more`;
        skillsChips.appendChild(more);
    }

    if (profile.lastUpdated) {
        const d = new Date(profile.lastUpdated);
        profileUpdated.textContent = `Updated ${d.toLocaleDateString()}`;
    }
}

// ── Reset Countdown ───────────────────────────────────────────
function showResetCountdown() {
    function tick() {
        const now     = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        const diff    = midnight - now;
        const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        resetTimer.textContent = `Resets in ${h}:${m}:${s}`;
    }
    tick();
    setInterval(tick, 1000);
}

// ── Helpers ───────────────────────────────────────────────────
function showScreen(name) {
    screenSetup.classList.add("hidden");
    screenProfile.classList.add("hidden");
    screenLimit.classList.add("hidden");
    screenSetup.classList.remove("active");
    screenProfile.classList.remove("active");
    screenLimit.classList.remove("active");

    const map = { setup: screenSetup, profile: screenProfile, limit: screenLimit };
    if (map[name]) {
        map[name].classList.remove("hidden");
        map[name].classList.add("active");
    }
}

function setLoading(on) {
    saveBtn.disabled = on;
    saveBtnText.textContent = on ? "Analyzing..." : "✨ Analyze & Save Profile";
    saveSpinner.classList.toggle("hidden", !on);
}

function setStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className   = `status-msg ${type}`;
}