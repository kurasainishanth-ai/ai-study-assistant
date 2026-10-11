import sqlite3
conn = sqlite3.connect(r"C:\Users\kuras\Desktop\ai-study-assistant\backend\studyverse.db")
c = conn.cursor()
c.execute("SELECT name FROM materials")
for row in c.fetchall():
    print(row[0])
conn.close()
