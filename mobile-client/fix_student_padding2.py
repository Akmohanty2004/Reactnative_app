import os
directory = 'src/screens/student'
for filename in os.listdir(directory):
    if filename.endswith('.js'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace("paddingTop: Platform.OS === 'android' ? 10 : 20", "paddingTop: Platform.OS === 'android' ? 40 : 50")
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Updated ' + filename)
