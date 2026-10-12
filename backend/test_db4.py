import sqlite3
import io
conn = sqlite3.connect(r"C:\Users\kuras\Desktop\ai-study-assistant\studyverse.db")
c = conn.cursor()
c.execute("SELECT name, content FROM materials WHERE name LIKE '%BayesianParameterEstimation%'")
rows = c.fetchall()
if rows:
    content = rows[0][1]
    pages = content.split("--- [Page ")
    with io.open("page4.txt", "w", encoding="utf-8") as f:
        for p in pages:
            if p.startswith("4]"):
                f.write(p)
conn.close()
