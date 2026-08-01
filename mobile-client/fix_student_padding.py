import os
directory = 'src/screens/student'
for filename in os.listdir(directory):
    if filename.endswith('.js'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Increase padding for insets calculations in headers
        new_content = content.replace("paddingTop: Math.max((insets.top || 20) - 15, 5)", "paddingTop: Math.max((insets.top || 20) + 15, 30)")
        new_content = new_content.replace("paddingTop: Platform.OS === 'android' ? 10 : 40", "paddingTop: Platform.OS === 'android' ? 40 : 50")
        new_content = new_content.replace("paddingTop: 40", "paddingTop: 50")
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Updated ' + filename)
