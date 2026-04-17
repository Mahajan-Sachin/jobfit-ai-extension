// ─────────────────────────────────────────────────────────────
//  JobFit AI – content.js
//  Injects "Analyze" button on job listing pages.
//  Shows results in an in-page overlay panel (no alert()).
// ─────────────────────────────────────────────────────────────

const API_BASE_URL  = "https://jobfit-ai-extension.vercel.app";
const DAILY_LIMIT   = 20;
const BUTTON_ID     = "jobfit-analyze-btn";
const OVERLAY_ID    = "jobfit-results-overlay";

// ── Boot ──────────────────────────────────────────────────────
(function init() {
    const url = window.location.href;
    if (!isSupportedSite(url)) return;

    // Retry up to 5 times to handle JS-rendered pages
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        const jdText = extractJobDescription();
        if (jdText || attempts >= 5) {
            clearInterval(interval);
            if (jdText) injectButton(jdText);
        }
    }, 1500);
})();

// ── Site Detection ────────────────────────────────────────────
function isSupportedSite(url) {
    return (
        url.includes("linkedin.com/jobs") ||
        url.includes("indeed.com")        ||
        url.includes("glassdoor.com")     ||
        url.includes("wellfound.com")
    );
}

// ── JD Extraction ─────────────────────────────────────────────
function extractJobDescription() {
    // Ordered list of selectors: most specific first
    const selectors = [
        // LinkedIn
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        // Indeed
        "#jobDescriptionText",
        ".jobsearch-jobDescriptionText",
        // Glassdoor
        "[data-test='jobDescriptionContent']",
        ".jobDescriptionContent",
        // Wellfound
        ".job-description",
        // Generic
        "[class*='description']",
        "[class*='job-detail']",
        "main"
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 200) {
            return el.innerText.trim().substring(0, 4000);
        }
    }

    // Keyword-based fallback from body text
    const bodyText  = document.body.innerText;
    const lower     = bodyText.toLowerCase();
    const keywords  = ["responsibilities", "requirements", "qualifications", "about the role", "job description", "you will"];

    for (const kw of keywords) {
        const idx = lower.indexOf(kw);
        if (idx !== -1) {
            return bodyText.substring(Math.max(0, idx - 100), idx + 4000);
        }
    }

    // Last resort: first 4000 chars of visible page text
    const text = document.body.innerText.trim();
    return text.length > 300 ? text.substring(0, 4000) : null;
}

// ── Inject Button ─────────────────────────────────────────────
function injectButton(jdText) {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.innerHTML = `<span style="font-size:16px">⚡</span> Analyze with JobFit AI`;
    Object.assign(btn.style, {
        position:        "fixed",
        bottom:          "24px",
        right:           "24px",
        padding:         "12px 20px",
        background:      "linear-gradient(135deg,#7c3aed,#a855f7)",
        color:           "white",
        border:          "none",
        borderRadius:    "12px",
        fontSize:        "14px",
        fontWeight:      "600",
        fontFamily:      "'Inter','Segoe UI',sans-serif",
        cursor:          "pointer",
        zIndex:          "2147483647",
        boxShadow:       "0 4px 20px rgba(124,58,237,0.5)",
        display:         "flex",
        alignItems:      "center",
        gap:             "8px",
        transition:      "all 0.2s ease"
    });

    btn.addEventListener("mouseenter", () => {
        btn.style.transform   = "translateY(-2px)";
        btn.style.boxShadow   = "0 8px 28px rgba(124,58,237,0.65)";
    });
    btn.addEventListener("mouseleave", () => {
        btn.style.transform   = "";
        btn.style.boxShadow   = "0 4px 20px rgba(124,58,237,0.5)";
    });

    btn.addEventListener("click", () => runAnalysis(jdText, btn));
    document.body.appendChild(btn);
}

// ── Run Analysis ──────────────────────────────────────────────
async function runAnalysis(jdText, btn) {
    // Rate limit check
    const remaining = await getRemainingAnalyses();
    if (remaining === 0) {
        showOverlay(null, "limit");
        return;
    }

    // Profile check
    const { userProfile } = await chrome.storage.local.get("userProfile");
    if (!userProfile || !userProfile.skills?.length) {
        showOverlay(null, "no-profile");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="jf-spin">↻</span> Analyzing…`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jobDescription:  jdText,
                userSkills:      userProfile.skills,
                experienceYears: userProfile.experienceYears
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        await incrementUsage();
        showOverlay(data, "results");

    } catch (err) {
        console.error("[JobFit AI] Analysis error:", err);
        showOverlay({ error: err.message }, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span style="font-size:16px">⚡</span> Analyze with JobFit AI`;
    }
}

// ── Results Overlay ───────────────────────────────────────────
function showOverlay(data, mode) {
    // Remove existing overlay
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
        position:   "fixed",
        top:        "0",
        right:      "0",
        width:      "360px",
        height:     "100vh",
        background: "linear-gradient(160deg,#0f0c29 0%,#302b63 60%,#24243e 100%)",
        color:      "#e8e8f0",
        fontFamily: "'Inter','Segoe UI',sans-serif",
        zIndex:     "2147483647",
        boxShadow:  "-8px 0 40px rgba(0,0,0,0.5)",
        overflowY:  "auto",
        display:    "flex",
        flexDirection: "column",
        animation:  "jfSlideIn 0.3s ease"
    });

    // Inject keyframe animation
    if (!document.getElementById("jf-styles")) {
        const style = document.createElement("style");
        style.id = "jf-styles";
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @keyframes jfSlideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
            @keyframes jfSpin    { to { transform: rotate(360deg); } }
            .jf-spin { display:inline-block; animation: jfSpin 0.8s linear infinite; font-size:16px; }
            #${OVERLAY_ID} * { box-sizing: border-box; font-family: 'Inter','Segoe UI',sans-serif; }
            .jf-chip { display:inline-block; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:500; margin:2px; }
            .jf-chip.match  { background:rgba(52,211,153,0.12); color:#34d399; border:1px solid rgba(52,211,153,0.25); }
            .jf-chip.miss   { background:rgba(248,113,113,0.12); color:#f87171; border:1px solid rgba(248,113,113,0.25); }
            .jf-tip { display:flex; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.04); border-radius:8px; margin-bottom:6px; font-size:12px; line-height:1.5; color:#94a3b8; }
            .jf-tip-num { color:#a78bfa; font-weight:700; flex-shrink:0; }
        `;
        document.head.appendChild(style);
    }

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    Object.assign(closeBtn.style, {
        position:   "absolute",
        top:        "14px",
        right:      "16px",
        background: "rgba(255,255,255,0.1)",
        border:     "none",
        color:      "#94a3b8",
        fontSize:   "14px",
        cursor:     "pointer",
        borderRadius: "6px",
        padding:    "4px 8px",
        lineHeight: "1"
    });
    closeBtn.addEventListener("click", () => overlay.remove());

    const content = document.createElement("div");
    Object.assign(content.style, { padding: "20px 18px", flex: "1" });

    if (mode === "results" && data && !data.error) {
        const score = parseInt(data.matchScore) || 0;
        const scoreColor = score >= 70 ? "#34d399" : score >= 45 ? "#fbbf24" : "#f87171";

        content.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                <span style="font-size:20px">⚡</span>
                <div>
                    <div style="font-size:15px;font-weight:700;color:#c8b8ff;">JobFit AI Results</div>
                    <div style="font-size:11px;color:#64748b;">vs your saved profile</div>
                </div>
            </div>

            <!-- Score Ring -->
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:56px;font-weight:800;color:${scoreColor};line-height:1;">${score}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Match Score / 100</div>
                <div style="margin:10px auto 0;width:180px;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                    <div style="width:${score}%;height:100%;background:${scoreColor};border-radius:3px;transition:width 1s ease;"></div>
                </div>
            </div>

            <!-- Summary -->
            ${data.summary ? `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12.5px;color:#94a3b8;line-height:1.6;">
                ${data.summary}
            </div>` : ""}

            <!-- Matching Skills -->
            ${data.matchingSkills?.length ? `
            <div style="margin-bottom:14px;">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:8px;">✅ Matching Skills (${data.matchingSkills.length})</div>
                <div>${data.matchingSkills.map(s => `<span class="jf-chip match">${s}</span>`).join("")}</div>
            </div>` : ""}

            <!-- Missing Skills -->
            ${data.missingSkills?.length ? `
            <div style="margin-bottom:14px;">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:8px;">❌ Missing Skills (${data.missingSkills.length})</div>
                <div>${data.missingSkills.map(s => `<span class="jf-chip miss">${s}</span>`).join("")}</div>
            </div>` : ""}

            <!-- Tips -->
            ${data.actionableTips?.length ? `
            <div>
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:8px;">💡 Action Tips</div>
                ${data.actionableTips.map((t, i) => `
                    <div class="jf-tip">
                        <span class="jf-tip-num">${i + 1}.</span>
                        <span>${t}</span>
                    </div>`).join("")}
            </div>` : ""}
        `;

    } else if (mode === "no-profile") {
        content.innerHTML = `
            <div style="text-align:center;padding:30px 10px;">
                <div style="font-size:40px;margin-bottom:12px;">👤</div>
                <div style="font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:8px;">No Profile Found</div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">Click the <strong style="color:#e8e8f0;">JobFit AI extension icon</strong> in your toolbar and save your resume profile first.</div>
            </div>
        `;
    } else if (mode === "limit") {
        content.innerHTML = `
            <div style="text-align:center;padding:30px 10px;">
                <div style="font-size:40px;margin-bottom:12px;">🚦</div>
                <div style="font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:8px;">Daily Limit Reached</div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">You've used all <strong style="color:#e8e8f0;">20 free analyses</strong> for today. Resets at midnight.</div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div style="text-align:center;padding:30px 10px;">
                <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
                <div style="font-size:15px;font-weight:700;color:#f87171;margin-bottom:8px;">Analysis Failed</div>
                <div style="font-size:12px;color:#94a3b8;">${data?.error || "Unknown error. Please try again."}</div>
            </div>
        `;
    }

    overlay.appendChild(closeBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// ── Rate Limiting Helpers (mirrors popup.js logic) ────────────
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

async function getRemainingAnalyses() {
    const usage = await getUsageData();
    return DAILY_LIMIT - usage.count;
}

async function incrementUsage() {
    const usage = await getUsageData();
    usage.count += 1;
    usage.timestamps.push(Date.now());
    await chrome.storage.local.set({ usageData: usage });
}