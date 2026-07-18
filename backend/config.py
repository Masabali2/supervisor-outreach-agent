import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent          # backend/ folder
ROOT_DIR = BASE_DIR.parent                           # supervisor-agent/ folder

load_dotenv(dotenv_path=ROOT_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
COUNTRY = os.getenv("COUNTRY", "Canada")
PRIORITY_REGION = os.getenv("PRIORITY_REGION", "")
FIELD = os.getenv("FIELD", "Artificial Intelligence")
MAX_UNIVERSITIES = int(os.getenv("MAX_UNIVERSITIES", "20"))

SEARCH_DELAY_SECONDS = 2.0
MAX_FACULTY_PER_UNIVERSITY = int(os.getenv("MAX_FACULTY_PER_UNIVERSITY", "5"))
UNIVERSITIES_CACHE = str(BASE_DIR / "data" / "universities.json")
FACULTY_CACHE = str(BASE_DIR / "data" / "faculty.json")
RANKED_FACULTY_CACHE = str(BASE_DIR / "data" / "ranked_faculty.json")
PROFILE_CACHE = str(BASE_DIR / "data" / "my_profile.json")