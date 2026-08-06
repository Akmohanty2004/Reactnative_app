import os

def patch_teacher():
    filepath = 'src/screens/teacher/ProfileScreen.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import
    if 'toggleChatbot' not in content:
        content = content.replace("import { toggleTheme }", "import { toggleTheme, toggleChatbot }")
    
    # State
    if 'showChatbot' not in content:
        content = content.replace(
            "const { theme } = useSelector((state) => state.ui",
            "const { theme, showChatbot } = useSelector((state) => state.ui"
        )
        content = content.replace(
            "const { theme } = useSelector(state => state.ui",
            "const { theme, showChatbot } = useSelector(state => state.ui"
        )

    # UI
    old_ui = """                <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                    <Feather name="bell" size={18} color="#34d399" />
                  </View>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Push Notifications</Text>
                  </View>
                  <Switch value={true} onValueChange={() => Toast.show({ type: 'info', text1: 'Preferences saved' })} />
                </View>"""
    new_ui = """                <View style={[styles.listItem, { borderBottomColor: colors.modalBorder }]}>
                  <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                    <Feather name="bell" size={18} color="#34d399" />
                  </View>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Push Notifications</Text>
                  </View>
                  <Switch value={true} onValueChange={() => Toast.show({ type: 'info', text1: 'Preferences saved' })} />
                </View>
                <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <View style={[styles.listIconWrapper, {backgroundColor: 'rgba(139, 92, 246, 0.1)'}]}>
                    <Feather name="message-circle" size={18} color="#8b5cf6" />
                  </View>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Show AI Assistant</Text>
                  </View>
                  <Switch 
                    value={showChatbot !== false} 
                    onValueChange={() => dispatch(toggleChatbot())} 
                    trackColor={{ false: "#cbd5e1", true: "#c4b5fd" }}
                    thumbColor={showChatbot !== false ? "#8b5cf6" : "#f1f5f9"}
                  />
                </View>"""
    
    if old_ui in content:
        content = content.replace(old_ui, new_ui)
    else:
        print("Could not find old UI block in Teacher Profile")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
def patch_admin():
    filepath = 'src/screens/admin/ProfileScreen.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import
    if 'toggleChatbot' not in content:
        content = content.replace("import { toggleTheme }", "import { toggleTheme, toggleChatbot }")
    
    # State
    if 'showChatbot' not in content:
        content = content.replace(
            "const { theme } = useSelector(state => state.ui",
            "const { theme, showChatbot } = useSelector(state => state.ui"
        )
        content = content.replace(
            "const { theme } = useSelector((state) => state.ui",
            "const { theme, showChatbot } = useSelector((state) => state.ui"
        )
        
    # UI
    old_ui = """                <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>App Theme</Text>
                    <Text style={[styles.listSubtitle, { color: colors.subText }]}>Toggle light and dark mode</Text>
                  </View>
                  <TouchableOpacity onPress={() => dispatch(toggleTheme())}>
                    <Feather name={isDarkMode ? "toggle-right" : "toggle-left"} size={28} color={isDarkMode ? "#a855f7" : colors.subText} />
                  </TouchableOpacity>
                </View>"""
    new_ui = """                <View style={[styles.listItem, { borderBottomColor: colors.listBorder }]}>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>App Theme</Text>
                    <Text style={[styles.listSubtitle, { color: colors.subText }]}>Toggle light and dark mode</Text>
                  </View>
                  <TouchableOpacity onPress={() => dispatch(toggleTheme())}>
                    <Feather name={isDarkMode ? "toggle-right" : "toggle-left"} size={28} color={isDarkMode ? "#a855f7" : colors.subText} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.listTextContainer}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Show AI Assistant</Text>
                    <Text style={[styles.listSubtitle, { color: colors.subText }]}>Toggle floating chatbot</Text>
                  </View>
                  <TouchableOpacity onPress={() => dispatch(toggleChatbot())}>
                    <Feather name={showChatbot !== false ? "toggle-right" : "toggle-left"} size={28} color={showChatbot !== false ? "#a855f7" : colors.subText} />
                  </TouchableOpacity>
                </View>"""
                
    if old_ui in content:
        content = content.replace(old_ui, new_ui)
    else:
        print("Could not find old UI block in Admin Profile")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_teacher()
patch_admin()
print("Done patching.")
