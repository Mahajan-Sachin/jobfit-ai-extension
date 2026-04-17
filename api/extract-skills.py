import json
import os
import sys

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
        resume_text = data.get("text", "").strip()

        if not resume_text:
            return json.dumps({"error": "No text provided"}), 400, cors_headers

        prompt = f"""You are an expert HR analyst. Analyze this resume text.
1. Extract technical skills as a list (programming languages, frameworks, tools, cloud platforms, databases).
2. Calculate total years of experience. Handle date ranges, gaps, and "Present" dates correctly.

Return ONLY valid JSON with this exact structure:
{{
    "skills": ["Skill1", "Skill2"],
    "experience_years": 0.0
}}

Resume Text:
{resume_text[:3000]}
"""

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result = completion.choices[0].message.content
        return result, 200, cors_headers

    except Exception as e:
        return json.dumps({"error": str(e)}), 500, cors_headers