import sys

file_path = r'C:\Users\kuras\Desktop\ai-study-assistant\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bad = 'width: +"%+",'
good = 'width: ${data.average_score}%,'

if bad in content:
    content = content.replace(bad, good)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
