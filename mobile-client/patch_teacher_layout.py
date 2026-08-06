import os
import re

teacher_dir = "src/screens/teacher"

def patch_file(filename):
    filepath = os.path.join(teacher_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove SafeAreaView from react-native imports
    content = re.sub(r',\s*SafeAreaView', '', content)
    content = re.sub(r'SafeAreaView,\s*', '', content)

    # 2. Change SafeAreaView tags to View
    content = content.replace('<SafeAreaView ', '<View ')
    content = content.replace('<SafeAreaView>', '<View>')
    content = content.replace('</SafeAreaView>', '</View>')

    # 3. Fix StatusBar in DashboardScreen
    if filename == "DashboardScreen.js":
        content = content.replace('translucent={true} backgroundColor="transparent"', 'translucent={false} backgroundColor={colors.bg}')
        content = content.replace('paddingTop: Platform.OS === \'android\' ? 10 : 20', 'paddingTop: 20')
    
    # 4. Fix StatusBar in ExamsScreen
    if filename == "ExamsScreen.js":
        content = content.replace('backgroundColor="transparent"', 'translucent={false} backgroundColor={colors.bg}')
        if '<StatusBar' not in content:
            content = content.replace('<View style={[styles.container, { backgroundColor: colors.bg }]}>', '<View style={[styles.container, { backgroundColor: colors.bg }]}><StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />')
    
    # 5. Fix StatusBar in ResultsScreen
    if filename == "ResultsScreen.js":
        pass # already has translucent={false}
        
    # 6. Fix StatusBar in StudentsListScreen
    if filename == "StudentsListScreen.js":
        content = content.replace('backgroundColor="transparent"', 'translucent={false} backgroundColor={colors.bg}')
    
    # 7. Fix StatusBar in ProfileScreen
    if filename == "ProfileScreen.js":
        if '<StatusBar' not in content:
            content = content.replace('<View style={[styles.container, { backgroundColor: colors.bg }]}>', '<View style={[styles.container, { backgroundColor: colors.bg }]}><StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />')
    
    # 8. Fix ExamDetailsScreen
    if filename == "ExamDetailsScreen.js":
        content = content.replace("paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20", "paddingTop: 20")
        if '<StatusBar' not in content:
            content = content.replace('<View style={[styles.container, { backgroundColor: colors.bg }]}>', '<View style={[styles.container, { backgroundColor: colors.bg }]}><StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />')

    # 9. ClassRequestsScreen
    if filename == "ClassRequestsScreen.js":
        if '<StatusBar' not in content:
            content = content.replace('<View style={[styles.container, { backgroundColor: colors.bg }]}>', '<View style={[styles.container, { backgroundColor: colors.bg }]}><StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />')

    # 10. CreateExamScreen
    if filename == "CreateExamScreen.js":
        if '<StatusBar' not in content:
            content = content.replace('<View style={[styles.container, { backgroundColor: colors.bg }]}>', '<View style={[styles.container, { backgroundColor: colors.bg }]}><StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent={false} backgroundColor={colors.bg} />')
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Patched {filename}")

files = [
    "DashboardScreen.js",
    "ExamsScreen.js", 
    "ResultsScreen.js",
    "StudentsListScreen.js",
    "ClassRequestsScreen.js",
    "CreateExamScreen.js",
    "ExamDetailsScreen.js",
    "ProfileScreen.js"
]

for file in files:
    patch_file(file)
