# -*- coding: utf-8 -*-
import sys
import re

file_path = r'C:\Users\kuras\Desktop\ai-study-assistant\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'width: \$\{data\.average_score\}%,', r'width: ${data.average_score}%,', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("FIXED")
