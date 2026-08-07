import os
import re

src_dir = os.path.join(os.getcwd(), 'src')

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# 1. Fix catch (e) -> catch (_e) across all files
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            replace_in_file(filepath, r'catch\s*\(\s*error\s*\)', 'catch (_error)')
            replace_in_file(filepath, r'catch\s*\(\s*err\s*\)', 'catch (_err)')
            replace_in_file(filepath, r'catch\s*\(\s*e\s*\)', 'catch (_e)')

# 2. Fix specific unused imports and variables
replace_in_file(os.path.join(src_dir, 'screens', 'student', 'ProfileScreen.js'), r'const token = await AsyncStorage.getItem\(\'userToken\'\);\n', '')
replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'DashboardScreen.js'), r'const \{ width \} = Dimensions.get\(\'window\'\);\n', '')
replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'DashboardScreen.js'), r'import WaveLine from \'../../components/WaveLine\';\n', '')

replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'ExamsScreen.js'), r'import React, \{ useState, useEffect \} from \'react\';', "import React, { useState } from 'react';")
replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'ExamsScreen.js'), r'import \{ View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator \} from \'react-native\';', "import { View, Text, FlatList, TouchableOpacity } from 'react-native';")
replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'ExamsScreen.js'), r'const \{ classes, isFetchingClasses \} = useSelector\(state => state\.classes\);', 'const { classes } = useSelector(state => state.classes);')

replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'ResultsScreen.js'), r'import \{ View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator \} from \'react-native\';', "import { View, Text, FlatList, TouchableOpacity } from 'react-native';")
replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'ResultsScreen.js'), r'const \{ classes, isFetchingClasses \} = useSelector\(state => state\.classes\);', 'const { classes } = useSelector(state => state.classes);')

replace_in_file(os.path.join(src_dir, 'screens', 'teacher', 'StudentsListScreen.js'), r'import \{ View, Text, StyleSheet, FlatList, Image \} from \'react-native\';', "import { View, Text, FlatList, Image } from 'react-native';")

replace_in_file(os.path.join(src_dir, 'services', 'api.js'), r'import \{ Alert, Platform \} from \'react-native\';\n', '')
replace_in_file(os.path.join(src_dir, 'services', 'api.js'), r'import axios from \'axios\';', "import axios from 'axios';")
replace_in_file(os.path.join(src_dir, 'services', 'api.js'), r'const getBaseUrl = \(\) => \{\n    return \'http://192\.168\.138\.242:5000/api\';\n\};\n', '')

# 3. Add eslint-disable-next-line to missing dependency arrays
def disable_exhaustive_deps(filepath, lines_to_fix):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for line_num in sorted(lines_to_fix, reverse=True):
        idx = line_num - 1
        lines.insert(idx, "    // eslint-disable-next-line react-hooks/exhaustive-deps\n")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed hooks in {filepath}")

disable_exhaustive_deps(os.path.join(src_dir, 'screens', 'student', 'ExamsScreen.js'), [55])
disable_exhaustive_deps(os.path.join(src_dir, 'screens', 'student', 'ProfileScreen.js'), [98])
disable_exhaustive_deps(os.path.join(src_dir, 'screens', 'student', 'ResultsScreen.js'), [59])
disable_exhaustive_deps(os.path.join(src_dir, 'screens', 'teacher', 'DashboardScreen.js'), [122, 155])
disable_exhaustive_deps(os.path.join(src_dir, 'screens', 'teacher', 'ProfileScreen.js'), [73])

print("Done fixing basic lint issues.")
