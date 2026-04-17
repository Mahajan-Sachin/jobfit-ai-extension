import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def main(request):
    # 1. Handle CORS (Optional but good for debugging)
    if request.method == 'OPTIONS':
        return '', 200

    try:
        # 2. Parse JSON Body
        # Vercel passes body as bytes in request.data
        data = json.loads(request.data.decode('utf-8'))
        
        resume_text = data.get("text", "")
        if not resume_text:
            return json.dumps({"error": "No text provided"}), 400

        # 3. Call Groq
        prompt = f"""
        You are an expert HR analyst. Analyze this resume text.
        1. Extract technical skills as a list.
        2. Calculate total years of experience (handle gaps, 'Present' dates).
        
        Return ONLY JSON:
        {{
            "skills": ["Skill1", "Skill2"],
            "experience_years": 0.0
        }}

        Text: {resume_text[:3000]}
        """

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        result = completion.choices[0].message.content
        return result, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        return json.dumps({"error": str(e)}), 500