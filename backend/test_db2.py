import sqlite3
import json
conn = sqlite3.connect(r"C:\Users\kuras\Desktop\ai-study-assistant\studyverse.db")
c = conn.cursor()
c.execute("SELECT name, content FROM materials WHERE name LIKE '%BayesianParameterEstimation%'")
rows = c.fetchall()
for row in rows:
    print(f"File: {row[0]}")
    content = row[1]
    # search for the expression
    idx = content.find("log p(")
    if idx != -1:
        start = max(0, idx - 100)
        end = min(len(content), idx + 100)
        print("FOUND NEAR:", repr(content[start:end]))
    else:
        print("Did not find 'log p('")
conn.close()
