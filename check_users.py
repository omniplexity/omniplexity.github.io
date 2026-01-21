import sqlite3

conn = sqlite3.connect('backend/data/omniplexity.db')
cursor = conn.cursor()
cursor.execute('SELECT id, username, role, status FROM users')
users = cursor.fetchall()

print("Existing users:")
for user in users:
    print(f"ID: {user[0]}, Username: {user[1]}, Role: {user[2]}, Status: {user[3]}")

conn.close()