import os

filepath = 'src/screens/auth/LoginScreen.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Title
content = content.replace(
    "<Text style={styles.title}>ExamHub</Text>",
    "<Text style={styles.title}>Welcome <Text style={{ color: '#8b5cf6' }}>Back</Text></Text>"
)

# 2. Roles Array Map
old_roles_map = """              <View style={styles.rolesContainer}>
                {roles.map((role) => {
                  const isActive = selectedRole === role.id;
                  return (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() => {
                        setSelectedRole(role.id);
                        setEmail('');
                        setPassword('');
                      }}
                      style={[
                        styles.roleButton,
                        isActive && { backgroundColor: role.color + '20', borderColor: role.color }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather name={role.icon} size={20} color={isActive ? 'white' : '#94a3b8'} style={{ zIndex: 1 }} />
                      <Text style={[styles.roleText, isActive && { color: 'white', fontWeight: 'bold' }, { zIndex: 1 }]}>{role.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>"""
new_roles_map = """              <View style={styles.rolesContainer}>
                {roles.map((role) => {
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
if old_roles_map in content:
    content = content.replace(old_roles_map, new_roles_map)
else:
    print("Could not find roles map")

# 3. Submit Button
old_submit = """              <BouncyTouchable 
                style={[styles.submitButton, isLoading && styles.disabledButton]} 
                onPress={handleSubmit}
                disabled={isLoading}
                activeScale={0.95}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Continue</Text>
                )}
              </BouncyTouchable>"""
new_submit = """              <BouncyTouchable 
                onPress={handleSubmit}
                disabled={isLoading}
                activeScale={0.95}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#3b82f6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.submitButton, { backgroundColor: 'transparent', flexDirection: 'row', gap: 10 }, isLoading && styles.disabledButton]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Continue</Text>
                      <Feather name="arrow-right" size={18} color="white" />
                    </>
                  )}
                </LinearGradient>
              </BouncyTouchable>"""
if old_submit in content:
    content = content.replace(old_submit, new_submit)
else:
    print("Could not find submit button")

# 4. Styles
old_roles_style = "rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },"
new_roles_style = "rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#0f172a', borderRadius: 16, padding: 4 },"
content = content.replace(old_roles_style, new_roles_style)

old_role_button = """  roleButton: {
    flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 4,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },"""
new_role_button = """  roleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
    borderRadius: 12,
  },"""
content = content.replace(old_role_button, new_role_button)

old_role_text = "roleText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 8 },"
new_role_text = "roleText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginLeft: 8 },"
content = content.replace(old_role_text, new_role_text)

old_input_container = """  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12, height: 56, paddingHorizontal: 16,
  },"""
new_input_container = """  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 14, height: 48, paddingHorizontal: 16,
  },"""
content = content.replace(old_input_container, new_input_container)

old_submit_style = """  submitButton: {
    backgroundColor: '#8b5cf6', borderRadius: 12, height: 56,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },"""
new_submit_style = """  submitButton: {
    borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },"""
content = content.replace(old_submit_style, new_submit_style)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Login Screen patched")
