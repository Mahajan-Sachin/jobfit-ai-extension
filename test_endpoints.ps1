$ErrorActionPreference = "Stop"
$API = "https://jobfit-ai-extension.vercel.app"

Write-Host "`n=== TEST 1: /api/extract-skills ===" -ForegroundColor Cyan
$body1 = @{ text = "Sachin Mahajan. Python Developer. 3 years at Infosys. Skills: Python, Django, AWS, Docker, React." } | ConvertTo-Json
$r1 = Invoke-RestMethod -Uri "$API/api/extract-skills" -Method Post -Body $body1 -ContentType "application/json"
$r1 | ConvertTo-Json -Depth 5

Write-Host "`n=== TEST 2: /api/analyze ===" -ForegroundColor Cyan
$body2 = @{
    jobDescription  = "We are looking for a Python backend developer with experience in AWS, Docker and REST APIs."
    userSkills      = @("Python", "Django", "AWS", "Docker")
    experienceYears = 3
} | ConvertTo-Json
$r2 = Invoke-RestMethod -Uri "$API/api/analyze" -Method Post -Body $body2 -ContentType "application/json"
$r2 | ConvertTo-Json -Depth 5
