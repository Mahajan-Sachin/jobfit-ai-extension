# test_api.py
import importlib.util
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent

spec_extract = importlib.util.spec_from_file_location('extract_skills', BASE / 'extract-skills.py')
extract_skills = importlib.util.module_from_spec(spec_extract)
spec_extract.loader.exec_module(extract_skills)

spec_analyze = importlib.util.spec_from_file_location('analyze', BASE / 'analyze.py')
analyze = importlib.util.module_from_spec(spec_analyze)
spec_analyze.loader.exec_module(analyze)

# Mock Request Object
class MockRequest:
    def __init__(self, data_dict):
        self.method = "POST"
        self.body = json.dumps(data_dict).encode('utf-8')

# Test 1: Extract Skills
print("--- Testing Skill Extraction ---")
mock_resume = MockRequest({
    "text": "Sachin Mahajan. Python Developer. Worked at Google from Jan 2020 to Dec 2022. Skills: Python, Django, SQL."
})
response = extract_skills.handler(mock_resume)
print(f"Status: {response['statusCode']}")
print(f"Result: {response['body']}\n")

# Test 2: Analyze Job
print("--- Testing Job Analysis ---")
mock_job = MockRequest({
    "jobDescription": "We need a Python developer with Django and AWS experience. 3+ years required.",
    "userSkills": ["Python", "Django", "SQL"],
    "experienceYears": 2.5
})
response = analyze.handler(mock_job)
print(f"Status: {response['statusCode']}")
print(f"Result: {response['body']}")