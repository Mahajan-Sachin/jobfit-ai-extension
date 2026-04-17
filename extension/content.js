// content.js - Runs on every page

console.log("JobFit AI Content Script Loaded");

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a supported site
    const url = window.location.href;
    if (!isSupportedSite(url)) return;

    // Try to extract JD after a short delay (to let JS-rendered pages load)
    setTimeout(() => {
        const jdText = extractJobDescription();
        if (jdText) {
            injectAnalysisButton(jdText);
        }
    }, 2000); // 2-second delay to ensure page loads
});

function isSupportedSite(url) {
    return url.includes('linkedin.com/jobs') || 
           url.includes('indeed.com') || 
           url.includes('glassdoor.com') || 
           url.includes('wellfound.com');
}

function extractJobDescription() {
    // Simple heuristic: look for common JD sections
    const keywords = ['job description', 'responsibilities', 'requirements', 'qualifications', 'about the role'];
    
    // Get all text from body
    const bodyText = document.body.innerText.toLowerCase();
    
    // Find first occurrence of any keyword
    for (let keyword of keywords) {
        const index = bodyText.indexOf(keyword);
        if (index !== -1) {
            // Return next 3000 characters from that point
            return document.body.innerText.substring(index, index + 3000);
        }
    }
    
    // Fallback: return first 3000 chars of body
    return document.body.innerText.substring(0, 3000);
}

function injectAnalysisButton(jdText) {
    // Create button element
    const button = document.createElement('button');
    button.textContent = '🔍 Analyze with JobFit AI';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Analyzing...';

        try {
            // Get user profile from storage
            const result = await chrome.storage.local.get('userProfile');
            if (!result.userProfile) {
                alert('Please set up your profile first by clicking the extension icon.');
                return;
            }

            const { skills, experienceYears } = result.userProfile;

            // Call our Vercel API
            const response = await fetch('https://your-vercel-app-name.vercel.app/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobDescription: jdText,
                    userSkills: skills,
                    experienceYears: experienceYears
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();

            // Show results in a simple alert (we'll improve UI later)
            alert(`
Match Score: ${data.matchScore}/100
Missing Skills: ${data.missingSkills.join(', ') || 'None'}
Summary: ${data.summary}
Tips: ${data.actionableTips.join('\n')}
            `);

        } catch (error) {
            console.error(error);
            alert('Error analyzing job. Please try again.');
        } finally {
            button.disabled = false;
            button.textContent = '🔍 Analyze with JobFit AI';
        }
    });

    document.body.appendChild(button);
}