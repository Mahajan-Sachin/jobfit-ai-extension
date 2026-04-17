import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def handler(request):
    # CORS handling
    if request.method == 'OPTIONS':
        return '', 200, {"Access-Control-Allow-Origin": "*"}

    try:
        data = json.loads(request.data.decode('utf-8'))
        
        jd_text = data.get("jobDescription", "")
        user_skills = data.get("userSkills", [])
        user_exp = data.get("experienceYears", 0)

        if not jd_text or not user_skills:
            return json.dumps({"error": "Missing data"}), 400

        prompt = f"""
        Compare candidate to Job Description.
        
        Candidate: Skills={json.dumps(user_skills)}, Exp={user_exp} yrs
        JD: {jd_text[:3000]}

        Return ONLY JSON:
        {{
            "matchScore": 0-100,
            "missingSkills": ["Skill1"],
            "matchingSkills": ["SkillA"],
            "summary": "Short summary.",
            "actionableTips": ["Tip 1"]
        }}
        """

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"}
        )

        result = completion.choices[0].message.content
        return result, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        return json.dumps({"error": str(e)}), 500