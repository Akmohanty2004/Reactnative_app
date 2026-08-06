import os
import re

filepath = 'src/screens/auth/LoginScreen.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the rolesContainer with an absolutely foolproof one
pattern = r"<View style=\{styles\.rolesContainer\}>.*?</View>"
replacement = """<View style={styles.rolesContainer}>
                {[ 
                  { id: 'student', label: 'Student', icon: 'user' }, 
                  { id: 'teacher', label: 'Teacher', icon: 'briefcase' }, 
                  { id: 'admin', label: 'Admin', icon: 'shield' } 
                ].map((role) => {
                  const isActive = selectedRole === role.id;
                  if (isActive) {
                    return (
                      <TouchableOpacity key={role.id} onPress={() => { setSelectedRole(role.id); setEmail(''); setPassword(''); }} style={{ flex: 1, marginHorizontal: 4 }}>
                        <LinearGradient colors={['#8b5cf6', '#3b82f6']} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.roleButton, { borderWidth: 0 }]}>
                          <Feather name={role.icon} size={16} color="white" />
                          <Text style={[styles.roleText, { color: 'white' }]}>{role.label}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity key={role.id} onPress={() => { setSelectedRole(role.id); setEmail(''); setPassword(''); }} style={{ flex: 1, marginHorizontal: 4 }}>
                      <View style={[styles.roleButton, { backgroundColor: '#1e293b', borderColor: '#1e293b' }]}>
                        <Feather name={role.icon} size={16} color="#94a3b8" />
                        <Text style={styles.roleText}>{role.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied foolproof roles container")
