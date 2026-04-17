from flask import Flask, request, jsonify
import json
import os
from dotenv import load_dotenv
from groq import Groq

# Import your existing handlers
# Note: We assume analyze.py and extract-skills.py are in the same folder
# If they are separate files, we can import them or paste their logic here.
# For simplicity, let's paste the logic directly into main.py to avoid import issues on Render.

load_dotenv()

app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.route('/api/extract-skills', methods=['POST', 'OPTIONS'])
def extract_skills():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        resume_text = data.get("text", "").strip()

        if not resume_text:
            return jsonify({"error": "No text provided"}), 400

        prompt = f"""You are an expert HR analyst. Analyze this resume text.
1. Extract technical skills as a list (languages, frameworks, tools, cloud, databases).
2. Calculate total years of experience. Handle gaps and "Present" dates correctly.

Return ONLY valid JSON:
{{
    "skills": ["Python", "Django"],
    "experience_years": 3.0
}}

Resume:
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

        return jsonify(json.loads(result)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze_job():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.json
        jd_text = data.get("jobDescription", "").strip()
        user_skills = data.get("userSkills", [])
        user_exp = data.get("experienceYears", 0)

        if not jd_text or not user_skills:
            return jsonify({"error": "Missing jobDescription or userSkills"}), 400

        prompt = f"""You are an expert technical recruiter and career coach.

Compare the candidate's profile to the Job Description below.

Candidate:
- Skills: {json.dumps(user_skills)}
- Years of Experience: {user_exp}

Job Description:
{jd_text[:3000]}

Return ONLY valid JSON:
{{
    "matchScore": 75,
    "matchingSkills": ["Python", "AWS"],
    "missingSkills": ["Docker", "Kubernetes"],
    "summary": "Two sentence fit summary.",
    "actionableTips": ["Tip 1.", "Tip 2.", "Tip 3."]
}}

matchScore must be an integer 0-100.
"""
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=700,
            response_format={"type": "json_object"}
        )
        result = completion.choices[0].message.content

        return jsonify(json.loads(result)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run()