import json
import os

# Load .env only when running locally
if not os.environ.get("VERCEL"):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def handler(request):
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        }

    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }

    try:
        data = json.loads(request.body.decode('utf-8'))

        jd_text = data.get("jobDescription", "").strip()
        user_skills = data.get("userSkills", [])
        user_exp = data.get("experienceYears", 0)

        if not jd_text or not user_skills:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({"error": "Missing jobDescription or userSkills"})
            }

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

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': result
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({"error": str(e)})
        }