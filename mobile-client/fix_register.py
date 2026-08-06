import os

filepath = 'src/screens/auth/RegisterScreen.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken comments
content = content.replace(
    "{/* Name & Email <Text style={{color: '#8b5cf6'}}>*</Text>/}",
    "{/* Name & Email */}"
)
content = content.replace(
    "{/* Phone & Age <Text style={{color: '#8b5cf6'}}>*</Text>/}",
    "{/* Phone & Age */}"
)
content = content.replace(
    "{/* Dept & College <Text style={{color: '#8b5cf6'}}>*</Text>/}",
    "{/* Dept & College */}"
)

# Remove Admin role
old_roles_array = """  const roles = [
    { id: "student", label: "Student", icon: "user", color: "#6366f1" },
    { id: "teacher", label: "Teacher", icon: "briefcase", color: "#8b5cf6" },
    { id: "admin", label: "Admin", icon: "shield", color: "#f43f5e" },
  ];"""

new_roles_array = """  const roles = [
    { id: "student", label: "Student", icon: "user", color: "#6366f1" },
    { id: "teacher", label: "Teacher", icon: "briefcase", color: "#8b5cf6" }
  ];"""

if old_roles_array in content:
    content = content.replace(old_roles_array, new_roles_array)
else:
    print("Could not find roles array!")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed RegisterScreen fields and removed admin")
