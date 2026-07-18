import os
import asyncio
import agents_workflow
from agents_workflow import init_audit_db

async def interactive_playground():
    init_audit_db()
    print("==================================================")
    # Highlight the branding
    print("Welcome to the AirSense AI Agent Playground!")
    print("==================================================")
    
    # Check if GEMINI_API_KEY is available
    if not os.environ.get("GEMINI_API_KEY"):
        print("WARNING: GEMINI_API_KEY environment variable is not set.")
        print("To run ADK agents, please set your GEMINI_API_KEY.")
        # Provide a prompt to enter the key for this run
        api_key = input("Enter your GEMINI_API_KEY (or press Enter to skip if using mock response): ").strip()
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key
            
    city = input("Enter City name (default: Delhi): ").strip() or "Delhi"
    asthma_input = input("Asthma History? (y/n, default: n): ").strip().lower()
    has_asthma = asthma_input == "y"
    
    user_profile = {
        "age": 28,
        "asthmaHistory": has_asthma,
        "allergyType": "Pollen",
        "sensitivityLevel": "High" if has_asthma else "Medium"
    }
    
    print("\nStarting playground loop... Type 'exit' to stop.")
    session_id = "playground_session"
    
    while True:
        try:
            query = input("\nAsk AirSense Assistant (e.g., 'Can I go outside today?'): ").strip()
            if not query:
                continue
            if query.lower() in ["exit", "quit"]:
                print("Exiting playground. Goodbye!")
                break
                
            if os.environ.get("GEMINI_API_KEY"):
                try:
                    result = await agents_workflow.run_adk_pipeline(city, has_asthma, query)
                except Exception as e:
                    print(f"ADK pipeline failed: {e}. Falling back to native pipeline.")
                    result = agents_workflow.run_native_pipeline(city, has_asthma, query)
            else:
                result = agents_workflow.run_native_pipeline(city, has_asthma, query)
            
            print(f"\n🤖 AirSense Assistant:\n{result.get('response')}")
        except KeyboardInterrupt:
            print("\nExiting playground...")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(interactive_playground())
