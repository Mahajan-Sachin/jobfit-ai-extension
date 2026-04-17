import json
import os

# Load .env only when running locally (Vercel sets VERCEL=1 automatically)
if not os.environ.get("VERCEL"):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def handler(request):
    # CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }

    if request.method == "OPTIONS":
        return "", 200, cors_headers

    if request.method != "POST":
        return json.dumps({"error": "Method not allowed"}), 405, cors_headers

    try:
        data = json.loads(request.data.decode("utf-8"))

        jd_text = data.get("jobDescription", "").strip()
        user_skills = data.get("userSkills", [])
        user_exp = data.get("experienceYears", 0)

        if not jd_text or not user_skills:
            return json.dumps({"error": "Missing jobDescription or userSkills"}), 400, cors_headers

        prompt = f"""You are an expert technical recruiter and career coach.

Compare the candidate's profile to the Job Description below.

Candidate Profile:
- Skills: {json.dumps(user_skills)}
- Years of Experience: {user_exp}

Job Description:
{jd_text[:3000]}

Return ONLY valid JSON with this exact structure:
{{
    "matchScore": 75,
    "matchingSkills": ["PythonA", "SkillB"],
    "missingSkills": ["AWS", "Docker"],
    "summary": "Two-sentence summary of the candidate's fit for this role.",
    "actionableTips": ["Tip 1 to improve fit.", "Tip 2.", "Tip 3."]
}}

matchScore must be an integer from 0-100.
"""

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=700,
            response_format={"type": "json_object"}
        )

        result = completion.choices[0].message.content
        return result, 200, cors_headers

    except Exception as e:
        return json.dumps({"error": str(e)}), 500, cors_headers