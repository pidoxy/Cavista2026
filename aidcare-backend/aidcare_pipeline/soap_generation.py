# aidcare_pipeline/soap_generation.py
# SOAP note generation via OpenAI GPT-4o-mini (replaces Gemini — better reliability)
import json
import os
import time

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL_SOAP = os.getenv("OPENAI_MODEL_SOAP", "gpt-4o")

_FALLBACK_SOAP_RESPONSE = {
    "soap_note": {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": "",
    },
    "patient_summary": "",
    "complexity_score": 1,
    "flags": [],
}


def generate_soap_note(transcript: str, language: str = "en") -> dict:
    """
    Generates a structured SOAP note from a consultation transcript using OpenAI.

    Args:
        transcript: Raw consultation transcript text (may contain Nigerian English,
                    medical Pidgin, or clinical abbreviations).
        language:   BCP-47 language hint (e.g. 'en', 'ha', 'yo', 'ig', 'pcm').

    Returns:
        dict with keys:
            soap_note         -> {subjective, objective, assessment, plan}
            patient_summary   -> one-line string
            complexity_score  -> int 1-5
            flags             -> list of strings
        Falls back to empty-field dict on any error.
    """
    if not OPENAI_API_KEY:
        print("ERROR (soap_generation): OPENAI_API_KEY not found in environment.")
        return {**_FALLBACK_SOAP_RESPONSE, "error": "Configuration error: Missing OpenAI API Key."}

    system_instruction = (
        "You are an expert medical scribe for Nigerian doctors. "
        "Structure consultation transcripts into SOAP format. "
        "Understand Nigerian English, medical Pidgin, and clinical abbreviations "
        "(OD, BD, TDS, POP, LAMA, co-artemether, NKDA, SOB, LOC, POM, T&A, etc). "
        "Extract all clinically relevant details accurately. "
        "The output must be a structured JSON object with no additional text."
    )

    prompt = f"""
Consultation Transcript (language hint: '{language}'):
\"\"\"
{transcript}
\"\"\"

Task:
Analyse the above consultation transcript and produce a SOAP note.

Return ONLY a single valid JSON object with the following keys:
- "soap_note": {{
    "subjective": "<patient's reported symptoms, history, and complaints in complete sentences>",
    "objective": "<observable/measurable findings mentioned: vitals, examination, investigations>",
    "assessment": "<clinical assessment, working diagnosis or differential diagnoses>",
    "plan": "<management plan: investigations ordered, medications prescribed, referrals, follow-up>"
  }}
- "patient_summary": "<one concise sentence summarising this patient's presentation and plan>"
- "complexity_score": <integer 1-5 where 1=routine, 5=critically complex>
- "flags": [<list of alert strings, e.g. "Urgent referral", "Allergy mentioned", "Abnormal vital signs", "Safeguarding concern">]

Scoring guidance for complexity_score:
  1 = Simple, single complaint, straightforward management
  2 = Mild complexity, minor comorbidities or 2-3 symptoms
  3 = Moderate complexity, multiple issues or uncertain diagnosis
  4 = High complexity, serious condition, significant comorbidities
  5 = Critical — immediate intervention required

If a section has no information, use an empty string "".
Return ONLY the JSON object. Do not include any text before or after it.
"""

    max_retries = 2
    raw_json_str = ""

    for attempt in range(max_retries):
        try:
            print(f"SOAP Gen - Attempt {attempt + 1} using model '{OPENAI_MODEL_SOAP}'...")

            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)

            response = client.chat.completions.create(
                model=OPENAI_MODEL_SOAP,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.15,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )

            raw_json_str = (response.choices[0].message.content or "").strip()

            # Clean markdown fences (sometimes present)
            if raw_json_str.startswith("```json"):
                raw_json_str = raw_json_str[len("```json"):]
            if raw_json_str.startswith("```"):
                raw_json_str = raw_json_str[len("```"):]
            if raw_json_str.endswith("```"):
                raw_json_str = raw_json_str[:-len("```")]
            raw_json_str = raw_json_str.strip()

            print(f"SOAP Gen - Raw response snippet (Attempt {attempt + 1}): {raw_json_str[:300]}...")

            if not raw_json_str:
                if attempt < max_retries - 1:
                    time.sleep(1 * (attempt + 1))
                    continue
                return {**_FALLBACK_SOAP_RESPONSE, "error": "OpenAI returned an empty response."}

            parsed = json.loads(raw_json_str)

            # Validate and fill missing top-level keys with defaults
            expected_keys = ["soap_note", "patient_summary", "complexity_score", "flags"]
            for key in expected_keys:
                if key not in parsed:
                    if key == "soap_note":
                        parsed[key] = {"subjective": "", "objective": "", "assessment": "", "plan": ""}
                    elif key == "flags":
                        parsed[key] = []
                    elif key == "complexity_score":
                        parsed[key] = 1
                    else:
                        parsed[key] = ""

            # Validate soap_note sub-keys
            soap_sub_keys = ["subjective", "objective", "assessment", "plan"]
            for sub_key in soap_sub_keys:
                if sub_key not in parsed.get("soap_note", {}):
                    parsed.setdefault("soap_note", {})[sub_key] = ""

            # Clamp complexity_score to 1-5
            try:
                parsed["complexity_score"] = max(1, min(5, int(parsed["complexity_score"])))
            except (ValueError, TypeError):
                parsed["complexity_score"] = 1

            print("SOAP Gen - Generated successfully.")
            return parsed

        except json.JSONDecodeError as e:
            print(f"SOAP Gen - JSONDecodeError (Attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            return {
                **_FALLBACK_SOAP_RESPONSE,
                "error": f"Failed to decode JSON for SOAP note. {str(e)}",
            }
        except Exception as e:
            print(f"SOAP Gen - Exception (Attempt {attempt + 1}): {e}")
            import traceback
            traceback.print_exc()
            if "rate_limit" in str(e).lower() or "429" in str(e).lower():
                if attempt < max_retries - 1:
                    time.sleep(10 * (attempt + 1))
                    continue
            elif attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            return {**_FALLBACK_SOAP_RESPONSE, "error": f"Unhandled error during SOAP generation: {str(e)}"}

    return {**_FALLBACK_SOAP_RESPONSE, "error": "Failed SOAP generation after all retries."}
