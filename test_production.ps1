$body = '{"text": "Sachin Mahajan. Python Developer. Skills: Python, Django."}'
$response = Invoke-RestMethod -Uri "https://jobfit-ai-extension-6bun9lmej-mahajan-sachins-projects.vercel.app/api/extract_skills?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=xZnXIfJyxfdtYTnAKAgoEzrKUB5VbTd6" -Method Post -Body $body -ContentType "application/json"
Write-Output $response

$body = '{"jobDescription":"We need a Python dev with AWS","userSkills":["Python"],"experienceYears":2}'
$response = Invoke-RestMethod -Uri "https://jobfit-ai-extension-6bun9lmej-mahajan-sachins-projects.vercel.app/api/analyze?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=xZnXIfJyxfdtYTnAKAgoEzrKUB5VbTd6" -Method Post -Body $body -ContentType "application/json"
Write-Output $response