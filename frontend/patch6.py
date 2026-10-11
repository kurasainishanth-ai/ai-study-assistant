# -*- coding: utf-8 -*-
import sys

file_path = r'C:\Users\kuras\Desktop\ai-study-assistant\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bad = 'width: ${data.average_score}%,'
good = 'width: `${data.average_score}%`,'

content = content.replace(bad, good)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("FIXED")
