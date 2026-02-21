import os

def read_utf16_file(path):
    try:
        with open(path, 'rb') as f:
            content = f.read()
        # Try to decode from UTF-16
        text = content.decode('utf-16')
        print(text)
    except Exception as e:
        print(f"Error reading file: {e}")
        # Try reading as UTF-8 just in case
        try:
            print(content.decode('utf-8'))
        except:
            print("Could not decode as UTF-8 either.")

if __name__ == "__main__":
    read_utf16_file('backend/server_test.log')
