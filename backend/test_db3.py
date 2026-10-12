import sqlite3
conn = sqlite3.connect(r"C:\Users\kuras\Desktop\ai-study-assistant\studyverse.db")
c = conn.cursor()
c.execute("SELECT name, content FROM materials WHERE name LIKE '%BayesianParameterEstimation%'")
rows = c.fetchall()
if rows:
    content = rows[0][1]
    pages = content.split("--- [Page ")
    for p in pages:
        if p.startswith("4]"):
            print("PAGE 4 TEXT:")
            print(p)
conn.close()
