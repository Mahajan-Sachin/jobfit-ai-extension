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
        resume_text = data.get("text", "").strip()

        if not resume_text:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({"error": "No text provided"})
            }

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