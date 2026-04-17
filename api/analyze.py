import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def main(request):
    try:
        body = request.get_data(as_text=True)
        if not body:
            return {"error": "No body provided"}, 400
            
        data = json.loads(body)
        jd_text = data.get("jobDescription", "")
        user_skills = data.get("userSkills", [])
        user_exp = data.get("experienceYears", 0)

        if not jd_text or not user_skills:
            return {"error": "Missing JD or User Skills"}, 400

        prompt = f"""
        You are a helpful career assistant. Compare the candidate's profile with the Job Description.
        
        Candidate Profile:
        - Skills: {json.dumps(user_skills)}
        - Experience: {user_exp} years

        Job Description:
        {jd_text[:3000]}

        Return ONLY a valid JSON object with this structure:
        {{
            "matchScore": 0-100,
            "missingSkills": ["Skill1", "Skill2"],
            "matchingSkills": ["SkillA", "SkillB"],
            "summary": "A concise 2-sentence summary of the fit.",
            "actionableTips": ["Tip 1", "Tip 2"]
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
        return json.loads(result), 200

    except Exception as e:
        return {"error": str(e)}, 500