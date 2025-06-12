import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Gemini configuration
DEFAULT_MODEL_NAME = "gemini-1.5-flash-latest" 

DEFAULT_GENERATION_CONFIG = {
    "temperature": 0.75,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# Default security settings
DEFAULT_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Global state model variables and API switches
_model_instance = None
_current_api_key = None
_current_system_instruction = None

# Gemini model initialization function
def _initialize_model_if_needed(api_key: str, system_instruction: str = None):
    global _model_instance, _current_api_key, _current_system_instruction

    api_key_to_use = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key_to_use:
        _model_instance = None
        _current_api_key = None
        _current_system_instruction = None
        raise ValueError("Gemini API key not provided. Please specify it in settings.")

    if _model_instance is None or _current_api_key != api_key_to_use or _current_system_instruction != system_instruction:
        try:
            genai.configure(api_key=api_key_to_use)
            _model_instance = genai.GenerativeModel(
                model_name=DEFAULT_MODEL_NAME,
                safety_settings=DEFAULT_SAFETY_SETTINGS,
                generation_config=DEFAULT_GENERATION_CONFIG,
                system_instruction=system_instruction if system_instruction and system_instruction.strip() else None
            )
            _current_api_key = api_key_to_use
            _current_system_instruction = system_instruction
            print(f"Gemini Model '{DEFAULT_MODEL_NAME}' successfully (re)initialized.")
            print(f"The system instruction used is: '{_current_system_instruction if _current_system_instruction else 'No'}'")
        except Exception as e:
            _model_instance = None
            _current_api_key = None
            _current_system_instruction = None
            print(f"CRITICAL ERROR initializing Gemini model: {e}")
            if "API_KEY_INVALID" in str(e) or "API key not valid" in str(e):
                 raise ValueError(f"Gemini API key is invalid or misconfigured: {e}")
            raise ConnectionError(f"Failed to connect to Gemini API with the provided key: {e}")

# Synchronous function to get Gemini response
def get_gemini_response_sync(prompt: str, chat_history_for_api: list = None, api_key: str = None, system_instruction: str = None) -> str:
    try:
        _initialize_model_if_needed(api_key, system_instruction)
    except (ValueError, ConnectionError) as e:
        return str(e)

    if not _model_instance:
        return "Critical Error: Gemini model was not initialized. Check console for errors."

    try:
        complete_prompt_sequence = []
        if chat_history_for_api:
            # Make sure the history is not too long to avoid tokenization errors
            # This is a very rough cut, ideally you should count tokens
            # Take for example the last 10 exchanges (20 messages)
            MAX_HISTORY_MESSAGES = 20 
            if len(chat_history_for_api) > MAX_HISTORY_MESSAGES:
                print(f"WARNING: Chat History ({len(chat_history_for_api)} messages) cut to {MAX_HISTORY_MESSAGES} for Gemini API.")
                complete_prompt_sequence.extend(chat_history_for_api[-MAX_HISTORY_MESSAGES:])
            else:
                complete_prompt_sequence.extend(chat_history_for_api)
        
        complete_prompt_sequence.append({'role': 'user', 'parts': [prompt]})

        # Synchronous call
        response = _model_instance.generate_content(complete_prompt_sequence)

        # Content Blocking Handling
        if not response.parts and response.prompt_feedback and response.prompt_feedback.block_reason:
            block_reason_message = f"The response was blocked by Gemini security system. Reason: {response.prompt_feedback.block_reason.name}."
            if response.candidates: # prompt_feedback can also be at the candidate level
                for candidate in response.candidates:
                    if candidate.finish_reason.name == "SAFETY" and candidate.safety_ratings:
                        safety_ratings_info = ", ".join([f"{rating.category.name.replace('HARM_CATEGORY_', '')}: {rating.probability.name}" for rating in candidate.safety_ratings])
                        block_reason_message += f" Safety ratings: [{safety_ratings_info}]."
                        break
            return block_reason_message
        
        # Checking and extracting text (more reliable way)
        try:
            # response.text may throw ValueError if response is empty or blocked without explicit block_reason
            return response.text
        except ValueError:
            # If .text didn't work, but there are .parts, we'll try to assemble the text from them
            if response.parts:
                collected_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
                if collected_text:
                    return collected_text
            # If this doesn't help, check block_reason again (maybe at the candidate level)
            if response.candidates:
                for candidate in response.candidates:
                    if candidate.finish_reason.name == "SAFETY":
                        return f"The response was blocked by the Gemini (candidate) security system."
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                         candidate_text = "".join(part.text for part in candidate.content.parts if hasattr(part, 'text'))
                         if candidate_text:
                             return candidate_text # Return the text of the first successful candidate, if any
            
            print(f"GEMINI WARNING: Failed to extract text response. Full response object: {response}")
            return "The response from Gemini does not contain any text data or has been blocked."


    except Exception as e:
        error_message = f"An error occurred while accessing the Gemini API: {e}"
        print(f"GEMINI ERROR (sync): {error_message}")
        # We log a full traceback for detailed diagnostics on the server
        import traceback
        traceback.print_exc()

        if "API_KEY_INVALID" in str(e) or "API key not valid" in str(e):
            return "Error: Gemini API key is invalid. Please check it in settings."
        if "DeadlineExceeded" in str(e):
            return "Error: Timed out waiting for response from Gemini. Try again later or simplify your request."
        if "permission_denied" in str(e).lower() or "PERMISSION_DENIED" in str(e).upper():
             return "Error: Access to Gemini API is denied. Make sure your API key is active and has the required permissions."
        if "ResourceExhausted" in str(e) or "quota" in str(e).lower():
            return "Error: Gemini API request quota exceeded. Please check your account limits or try again later."
        # The "Event loop is closed" error should no longer occur, but we'll leave the general handling
        if "Event loop is closed" in str(e):
            return f"An internal asynchronization error occurred. Details: {str(e)[:150]}"
        
        return f"An internal error occurred while processing your request to Gemini. Details: {str(e)[:150]}"


# To test this module separately
if __name__ == "__main__":
    def test_gemini_interaction_sync():
        test_api_key = os.getenv("GEMINI_API_KEY")
        if not test_api_key:
            print("The test requires GEMINI_API_KEY in the .env file.")
            return

        print("--- Test 1 (sync): Simple query ---")
        response1 = get_gemini_response_sync("Hello, Gemini! How are you?", api_key=test_api_key)
        print(f"Ответ Gemini: {response1}\n")

        print("--- Test 2 (sync): Query with history ---")
        history_example_api_format = [
            {'role': 'user', 'parts': ["Tell me a short fact about space."]},
            {'role': 'model', 'parts': ["The largest known star, UY Scuti, is so large that if it were at the center of our solar system, its surface would extend beyond the orbit of Jupiter!"]}
        ]
        user_prompt2 = "Thank you! And what is the coldest object in the Universe known?"
        response2 = get_gemini_response_sync(user_prompt2, chat_history_for_api=history_example_api_format, api_key=test_api_key)
        print(f"Request: {user_prompt2}")
        print(f"Gemini's answer: {response2}\n")

        print("--- Test 3 (sync): Request with system instruction ---")
        system_instr = "You are Shakespeare. Answer in the style of his works."
        user_prompt3 = "What do you think about modern technologies?"
        response3 = get_gemini_response_sync(user_prompt3, api_key=test_api_key, system_instruction=system_instr)
        print(f"Request: {user_prompt3} (System instruction: {system_instr})")
        print(f"Gemini's answer: {response3}\n")
        
        print("--- Test 4 (sync): Request that can be blocked (example) ---")
        user_prompt4 = "Tell me something very dangerous." 
        response4 = get_gemini_response_sync(user_prompt4, api_key=test_api_key)
        print(f"Request: {user_prompt4}")
        print(f"Gemini's answer: {response4}\n")

    test_gemini_interaction_sync()