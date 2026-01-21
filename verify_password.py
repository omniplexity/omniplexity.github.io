from backend.app.auth.password import verify_password
import sqlite3

# Get the stored hash
conn = sqlite3.connect('backend/data/omniplexity.db')
cursor = conn.cursor()
cursor.execute('SELECT password_hash FROM users WHERE username = "admin"')
result = cursor.fetchone()
conn.close()

if result:
    stored_hash = result[0]
    print(f"Stored hash: {stored_hash}")

    # Test common passwords
    test_passwords = ["admin123", "adminpass", "admin", "password"]

    for password in test_passwords:
        if verify_password(password, stored_hash):
            print(f"✅ Password match found: '{password}'")
            break
    else:
        print("❌ None of the common passwords matched")
        print("The admin user may have been created with a different password")
else:
    print("No admin user found")