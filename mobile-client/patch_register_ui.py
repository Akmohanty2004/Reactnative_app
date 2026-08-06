import os
import re

filepath = 'src/screens/auth/RegisterScreen.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Title
content = content.replace(
    "<Text style={styles.title}>Create Account</Text>",
    "<Text style={styles.title}>Create <Text style={{ color: '#8b5cf6' }}>Account</Text></Text>"
)

# 2. Update Submit Button
old_submit = """                  <TouchableOpacity style={[styles.submitButton, isLoading && styles.disabledButton]} onPress={handleSubmit} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Send OTP</Text>}
                  </TouchableOpacity>"""
new_submit = """                  <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
                    <LinearGradient
                      colors={['#8b5cf6', '#3b82f6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.submitButton, { backgroundColor: 'transparent', flexDirection: 'row', gap: 10 }, isLoading && styles.disabledButton]}
                    >
                      {isLoading ? <ActivityIndicator color="white" /> : (
                        <>
                          <Text style={styles.submitButtonText}>Send OTP</Text>
                          <Feather name="send" size={18} color="white" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>"""

if old_submit in content:
    content = content.replace(old_submit, new_submit)
else:
    print("Could not find old_submit block!")

# 3. Update Roles Switch
old_roles = """                  {roles.map(r => {
                    const isActive = role === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setRole(r.id)}
                        style={[
                          styles.roleButton,
                          isActive && { backgroundColor: r.color + '33', borderColor: r.color }
                        ]}
                      >
                        <Feather name={r.icon} size={16} color={isActive ? r.color : '#94a3b8'} />
                        <Text style={[styles.roleText, isActive && { color: r.color }]}>{r.title}</Text>
                      </TouchableOpacity>
                    );
                  })}"""
new_roles = """                  {roles.map(r => {
                    const isActive = role === r.id;
                    if (isActive) {
                      return (
                        <TouchableOpacity key={r.id} onPress={() => setRole(r.id)} style={{ flex: 1, marginHorizontal: 4 }}>
                          <LinearGradient colors={['#8b5cf6', '#3b82f6']} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.roleButton, { borderWidth: 0 }]}>
                            <Feather name={r.icon} size={16} color="white" />
                            <Text style={[styles.roleText, { color: 'white' }]}>{r.title}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity key={r.id} onPress={() => setRole(r.id)} style={{ flex: 1, marginHorizontal: 4 }}>
                        <View style={[styles.roleButton, { backgroundColor: '#1e293b', borderColor: '#1e293b' }]}>
                          <Feather name={r.icon} size={16} color="#94a3b8" />
                          <Text style={styles.roleText}>{r.title}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}"""

if old_roles in content:
    content = content.replace(old_roles, new_roles)
else:
    print("Could not find old_roles block!")

# 4. Update Styles
old_roles_container = "rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },"
new_roles_container = "rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#0f172a', borderRadius: 16, padding: 4 },"
content = content.replace(old_roles_container, new_roles_container)

old_input_box = "inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 14, height: 48 },"
new_input_box = "inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 14, height: 48 },"
content = content.replace(old_input_box, new_input_box)

old_submit_style = "submitButton: { backgroundColor: '#10b981', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 15 },"
new_submit_style = "submitButton: { borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 15 },"
content = content.replace(old_submit_style, new_submit_style)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
