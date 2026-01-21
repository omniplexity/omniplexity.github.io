import sqlite3

conn = sqlite3.connect('backend/data/omniplexity.db')
cursor = conn.cursor()
cursor.execute('SELECT id, username, password_hash FROM users WHERE username = "admin"')
user = cursor.fetchone()

if user:
    print(f"Admin user found: ID {user[0]}, Username: {user[1]}")
    print(f"Password hash: {user[2]}")
    print("\nTry logging in with:")
    print("- Username: admin")
    print("- Password: admin123 (if you created it) OR adminpass (if from tests) OR check the test files")
else:
    print("No admin user found")

conn.close()