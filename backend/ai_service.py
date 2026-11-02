
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def generate_ai_response(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    with genai.Client(api_key=api_key) as client:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are SupportPilot AI, an intelligent customer "
                    "support assistant. Provide accurate, concise, "
                    "professional and helpful support recommendations."
                ),
                temperature=0.3,
                max_output_tokens=1500,
            ),
        )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    return response.text
