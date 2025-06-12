import sys
from app.main import main_app_loop

if __name__ == '__main__':
    print("Initializing Kiala...")
    print(f"Python version: {sys.version}")
    print(f"Platform: {sys.platform}")
          
    try:
        main_app_loop()
    except KeyboardInterrupt:
        print("\nKiala application was terminated by the user (Ctrl+C).")
    except Exception as e:
        print(f"\nUNHANDLED GLOBAL ERROR IN KIALA: {e}", file=sys.stderr)
    finally:
        print("Kiala's shutdown.")
        sys.exit(0)