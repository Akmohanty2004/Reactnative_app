import os

base_dir = "src/screens/auth"
register_file = os.path.join(base_dir, "RegisterScreen.js")
login_file = os.path.join(base_dir, "LoginScreen.js")

def patch_file(filepath, rules):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in rules:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Rules for RegisterScreen.js
register_rules = [
    # 1. Add LinearGradient import if missing
    ("import { StatusBar } from 'expo-status-bar';", "import { StatusBar } from 'expo-status-bar';\nimport { LinearGradient } from 'expo-linear-gradient';"),
    
    # 2. Update Create Account text
    ("<Text style={styles.title}>Create Account</Text>", "<Text style={styles.title}>Create <Text style={{color: '#8b5cf6'}}>Account</Text></Text>"),
    
    # 3. Update Roles Buttons (add LinearGradient and style overrides)
    (
        '''                          style={[
                            styles.roleButton,
                            isActive && { backgroundColor: r.color + '33', borderColor: r.color }
                          ]}
                        >''',
        '''                          style={[
                            styles.roleButton,
                            !isActive && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'transparent' },
                            isActive && { borderColor: 'transparent' }
                          ]}
                        >
                          {isActive && (
                            <LinearGradient
                              colors={['#8b5cf6', '#3b82f6']}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                              style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                            />
                          )}'''
    ),
    
    # 4. Update Input Labels to have purple asterisk
    ("Full Name *", "Full Name <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Email *", "Email <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Phone *", "Phone <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Age *", "Age <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Dept *", "Dept <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("College *", "College <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Password *", "Password <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Confirm *", "Confirm <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Class / Group *", "Class / Group <Text style={{color: '#8b5cf6'}}>*</Text>"),
    ("Address *", "Address <Text style={{color: '#8b5cf6'}}>*</Text>"),
    
    # 5. Update input icons to be purple
    ('color="#64748b" style={styles.inputIcon}', 'color="#8b5cf6" style={styles.inputIcon}'),
    
    # 6. Update Send OTP button to LinearGradient
    (
        '''<TouchableOpacity style={[styles.submitButton, isLoading && styles.disabledButton]} onPress={handleSubmit} disabled={isLoading}>
                      {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Send OTP</Text>}
                    </TouchableOpacity>''',
        '''<TouchableOpacity style={[styles.submitButton, isLoading && styles.disabledButton, { padding: 0, overflow: 'hidden', borderWidth: 0 }]} onPress={handleSubmit} disabled={isLoading}>
                      <LinearGradient
                        colors={['#8b5cf6', '#3b82f6']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
                      >
                        {isLoading ? <ActivityIndicator color="white" /> : (
                          <>
                            <Text style={styles.submitButtonText}>Send OTP</Text>
                            <Feather name="send" size={18} color="white" style={{ position: 'absolute', right: 20 }} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>'''
    ),
    
    # 7. Update Verify & Register button
    (
        '''<TouchableOpacity 
                      style={[styles.submitButton, { marginTop: 20, flexDirection: 'row', gap: 8 }]}
                      onPress={handleVerifyOTP}
                      disabled={isLoading}
                    >''',
        '''<TouchableOpacity 
                      style={[styles.submitButton, { marginTop: 20, padding: 0, overflow: 'hidden', borderWidth: 0 }]}
                      onPress={handleVerifyOTP}
                      disabled={isLoading}
                    >
                      <LinearGradient
                        colors={['#8b5cf6', '#3b82f6']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                      >'''
    ),
    (
        '''                        </>
                      )}
                    </TouchableOpacity>''',
        '''                        </>
                      )}
                      </LinearGradient>
                    </TouchableOpacity>'''
    ),
    
    # 8. Update Login Link Text color in styles
    ("loginTextBold: { color: '#3b82f6'", "loginTextBold: { color: '#8b5cf6'"),
    
    # 9. Update card glowing border in styles
    (
        "card: { width: '100%', maxWidth: 450, backgroundColor: 'rgba(30, 41, 59, 0.85)', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }",
        "card: { width: '100%', maxWidth: 450, backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.5)', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 }"
    ),
    
    # 10. Update Green colors in OTP screen to purple
    ("color: '#10b981'", "color: '#8b5cf6'"),
    ("backgroundColor: 'rgba(16, 185, 129, 0.15)'", "backgroundColor: 'rgba(139, 92, 246, 0.15)'"),
    ("borderColor: 'rgba(16, 185, 129, 0.3)'", "borderColor: 'rgba(139, 92, 246, 0.3)'"),
    ("borderColor: '#10b981'", "borderColor: '#8b5cf6'"),
    ("shadowColor: '#10b981'", "shadowColor: '#8b5cf6'"),
    ("backgroundColor: 'rgba(16, 185, 129, 0.12)'", "backgroundColor: 'rgba(139, 92, 246, 0.12)'"),
    ('color="#10b981"', 'color="#8b5cf6"'),
]

patch_file(register_file, register_rules)
print("Patched RegisterScreen.js")

# Rules for LoginScreen.js
login_rules = [
    # 1. Add LinearGradient import if missing (it's already imported, but let's make sure)
    
    # 2. Update Welcome Back text
    ("<Text style={styles.title}>Welcome Back</Text>", "<Text style={styles.title}>Welcome <Text style={{color: '#8b5cf6'}}>Back</Text></Text>"),
    
    # 3. Update Roles Buttons
    (
        '''                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleButton,
                          isActive && { backgroundColor: role.color + '20', borderColor: role.color }
                        ]}
                        onPress={() => setSelectedRole(role.id)}
                      >''',
        '''                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleButton,
                          !isActive && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'transparent' },
                          isActive && { borderColor: 'transparent' }
                        ]}
                        onPress={() => setSelectedRole(role.id)}
                      >
                        {isActive && (
                          <LinearGradient
                            colors={['#8b5cf6', '#3b82f6']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                          />
                        )}'''
    ),
    (
        '''<Text style={[styles.roleText, isActive && { color: role.color, fontWeight: 'bold' }]}>{role.label}</Text>''',
        '''<Text style={[styles.roleText, isActive && { color: 'white', fontWeight: 'bold' }, { zIndex: 1 }]}>{role.label}</Text>'''
    ),
    ('<Feather name={role.icon} size={20} color={isActive ? role.color : \'#94a3b8\'} />', '<Feather name={role.icon} size={20} color={isActive ? \'white\' : \'#94a3b8\'} style={{ zIndex: 1 }} />'),
    
    # 4. Update Input icons to purple
    ('color="#64748b" style={styles.inputIcon}', 'color="#8b5cf6" style={styles.inputIcon}'),
    
    # 5. Update Send OTP button to LinearGradient
    (
        '''                <TouchableOpacity 
                  style={[styles.submitButton, (isLoading || !email.trim()) && styles.disabledButton]} 
                  onPress={handleSendOTP}
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Send OTP</Text>}
                </TouchableOpacity>''',
        '''                <TouchableOpacity 
                  style={[styles.submitButton, (isLoading || !email.trim()) && styles.disabledButton, { padding: 0, overflow: 'hidden', borderWidth: 0 }]} 
                  onPress={handleSendOTP}
                  disabled={isLoading || !email.trim()}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#3b82f6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}
                  >
                    {isLoading ? <ActivityIndicator color="white" /> : (
                      <>
                        <Text style={styles.submitButtonText}>Send OTP</Text>
                        <Feather name="send" size={18} color="white" style={{ position: 'absolute', right: 20 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>'''
    ),
    
    # 6. Update Verify OTP button to LinearGradient
    (
        '''                <TouchableOpacity 
                  style={[styles.submitButton, { marginTop: 15, flexDirection: 'row', gap: 8 }]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >''',
        '''                <TouchableOpacity 
                  style={[styles.submitButton, { marginTop: 15, padding: 0, overflow: 'hidden', borderWidth: 0 }]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#3b82f6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                  >'''
    ),
    (
        '''                    </>
                  )}
                </TouchableOpacity>''',
        '''                    </>
                  )}
                  </LinearGradient>
                </TouchableOpacity>'''
    ),
    
    # 7. Update Sign up Link Text color in styles
    ("registerTextBold: { color: '#3b82f6'", "registerTextBold: { color: '#8b5cf6'"),
    
    # 8. Update Login card glowing border in styles
    (
        "card: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 24, padding: 30, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }",
        "card: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: 24, padding: 30, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.5)', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 }"
    ),
    
    # 9. Update Green colors in OTP screen to purple
    ("color: '#10b981'", "color: '#8b5cf6'"),
    ("backgroundColor: 'rgba(16, 185, 129, 0.15)'", "backgroundColor: 'rgba(139, 92, 246, 0.15)'"),
    ("borderColor: 'rgba(16, 185, 129, 0.3)'", "borderColor: 'rgba(139, 92, 246, 0.3)'"),
    ("borderColor: '#10b981'", "borderColor: '#8b5cf6'"),
    ("shadowColor: '#10b981'", "shadowColor: '#8b5cf6'"),
    ("backgroundColor: 'rgba(16, 185, 129, 0.12)'", "backgroundColor: 'rgba(139, 92, 246, 0.12)'"),
    ('color="#10b981"', 'color="#8b5cf6"'),
]

patch_file(login_file, login_rules)
print("Patched LoginScreen.js")
