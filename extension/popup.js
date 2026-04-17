// Replace this with your actual Vercel URL after deployment
// For now, we will simulate success if we can't reach localhost
const API_BASE_URL = "https://your-vercel-app-name.vercel.app"; 

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resumeInput = document.getElementById('resume-input');
    const statusMsg = document.getElementById('status-msg');
    const setupSection = document.getElementById('setup-section');
    const profileStatus = document.getElementById('profile-status');
    const savedSkills = document.getElementById('saved-skills');
    const savedExp = document.getElementById('saved-exp');

    // Check if profile already exists
    checkExistingProfile();

    saveBtn.addEventListener('click', async () => {
        const text = resumeInput.value.trim();
        if (!text) {
            statusMsg.textContent = "Please paste your resume text.";
            statusMsg.style.color = "red";
            return;
        }

        statusMsg.textContent = "Analyzing resume...";
        statusMsg.style.color = "blue";
        saveBtn.disabled = true;

        try {
            // In production, this fetches from Vercel
            // For local testing, we'll simulate the response if fetch fails
            let response;
            try {
                response = await fetch(`${API_BASE_URL}/api/extract-skills`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                });
            } catch (err) {
                console.warn("Local fetch failed (expected if not deployed). Using mock data.");
                // Mock response for local testing
                response = {
                    ok: true,
                    json: async () => ({ skills: ["Python", "Test"], experience_years: 1.5 })
                };
            }

            if (response.ok) {
                const data = await response.json();
                
                // Save to Chrome Storage
                await chrome.storage.local.set({
                    userProfile: {
                        skills: data.skills,
                        experienceYears: data.experience_years,
                        lastUpdated: new Date().toISOString()
                    }
                });

                statusMsg.textContent = "Profile Saved!";
                statusMsg.style.color = "green";
                showProfile(data.skills, data.experience_years);
            } else {
                throw new Error("API Error");
            }
        } catch (error) {
            statusMsg.textContent = "Error saving profile. Check console.";
            statusMsg.style.color = "red";
            console.error(error);
        } finally {
            saveBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        chrome.storage.local.remove('userProfile', () => {
            location.reload();
        });
    });

    function checkExistingProfile() {
        chrome.storage.local.get('userProfile', (result) => {
            if (result.userProfile) {
                showProfile(result.userProfile.skills, result.userProfile.experienceYears);
            }
        });
    }

    function showProfile(skills, exp) {
        setupSection.style.display = 'none';
        profileStatus.style.display = 'block';
        savedSkills.textContent = skills.join(', ');
        savedExp.textContent = exp;
    }
});