import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  registerUser,
  verifyRegisterUser,
  clearError,
} from "../../redux/slices/authSlice";
import registerBg from "../../../assets/registerbackground.png";

export default function RegisterScreen({ navigation }) {
  const otpInputRef = useRef(null);
  const adminOtpInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [otp, setOtp] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [availableClasses, setAvailableClasses] = useState([]);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    college: "",
    age: "",
    password: "",
    confirmPassword: "",
    address: "",
    classGroup: "",
  });

  const dispatch = useDispatch();
  const {
    isLoading,
    error,
    registerOtpSent,
    loginEmail,
    loginRole,
    loginPassword,
    registrationData,
  } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!registerOtpSent) return;
    const finalRole = role || loginRole;
    if (finalRole !== "student") {
      if (otp.length === 6 && adminOtp.length === 6) {
        handleVerifyOTP();
      }
    } else {
      if (otp.length === 6) {
        handleVerifyOTP();
      }
    }
  }, [otp, adminOtp]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Fetch classes
    const fetchClasses = async () => {
      try {
        const { default: api } = await import("../../services/api");
        const res = await api.get("/api/classes");
        setAvailableClasses(res.data.classes || []);
      } catch (err) {
        console.log("Error fetching classes:", err);
        setAvailableClasses([]);
      }
    };
    fetchClasses();
  }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.email) newErrors.email = "Required";
    else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email.trim())
    )
      newErrors.email = "Invalid User ID / Email";
    if (!formData.phone) newErrors.phone = "Required";
    else if (!/^[0-9]{10}$/.test(formData.phone))
      newErrors.phone = "Must be 10 digits";
    if (!formData.department) newErrors.department = "Required";
    if (!formData.college) newErrors.college = "Required";
    if (!formData.age) newErrors.age = "Required";
    if (!formData.password) newErrors.password = "Required";
    else if (formData.password.length < 6) newErrors.password = "Min 6 chars";
    if (formData.confirmPassword !== formData.password)
      newErrors.confirmPassword = "Passwords mismatch";
    if (!formData.address) newErrors.address = "Required";
    if (role === "student" && !formData.classGroup)
      newErrors.classGroup = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    dispatch(
      registerUser({
        ...formData,
        email: formData.email.trim(),
        role,
      }),
    );
  };

  const handleVerifyOTP = async () => {
    let newErrors = {};
    if (!otp) newErrors.otp = "Please enter the OTP";
    if (role !== "student" && !adminOtp)
      newErrors.adminOtp = "Please enter the Admin OTP";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalData = registrationData || formData;
    const finalEmail = finalData.email || loginEmail;
    const finalRole = finalData.role || loginRole || role;

    dispatch(
      verifyRegisterUser({
        ...finalData,
        email: finalEmail.trim(),
        role: finalRole,
        otp,
        adminOtp: finalRole !== "student" ? adminOtp : undefined,
      }),
    ).then((action) => {
      if (action.meta && action.meta.requestStatus === "fulfilled") {
        navigation.navigate("Login");
      }
    });
  };

  const handleResendOTP = () => {
    const finalData = registrationData || formData;
    if (finalData && finalData.email) {
      dispatch(
        registerUser({
          ...finalData,
          email: finalData.email.trim(),
          role: finalData.role || role,
        }),
      );
    }
  };

  const renderOtpBoxes = (val = "") => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const digit = val[i] || "";
      const isCurrent = val.length === i;
      boxes.push(
        <View
          key={i}
          style={[
            styles.otpBox,
            isCurrent && styles.otpBoxActive,
            digit && styles.otpBoxFilled,
          ]}
        >
          <Text style={styles.otpDigit}>{digit}</Text>
        </View>,
      );
    }
    return boxes;
  };

  const roles = [
    { id: "student", label: "Student", icon: "user", color: "#6366f1" },
    { id: "teacher", label: "Teacher", icon: "briefcase", color: "#8b5cf6" },
  ];

  return (
    <ImageBackground source={registerBg} style={styles.backgroundImage}>
      <View style={styles.overlay} />
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <StatusBar style="light" />
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            {!registerOtpSent ? (
              <View>
                <View style={styles.headerContainer}>
                  <View
                    style={[
                      styles.logoIcon,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    <Image
                      source={require("../../../assets/Applogo.png")}
                      style={{ width: 64, height: 64, borderRadius: 16 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.title}>
                    Create <Text style={{ color: "#8b5cf6" }}>Account</Text>
                  </Text>
                  <Text style={styles.subtitle}>Join ExamHub today</Text>
                </View>

                {/* Role Selection */}
                <View style={styles.rolesContainer}>
                  {roles.map((r) => {
                    const isActive = role === r.id;
                    if (isActive) {
                      return (
                        <TouchableOpacity
                          key={r.id}
                          onPress={() => setRole(r.id)}
                          style={{ flex: 1, marginHorizontal: 4 }}
                        >
                          <LinearGradient
                            colors={["#8b5cf6", "#3b82f6"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.roleButton, { borderWidth: 0 }]}
                          >
                            <Feather name={r.icon} size={16} color="white" />
                            <Text style={[styles.roleText, { color: "white" }]}>
                              {r.label}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setRole(r.id)}
                        style={{ flex: 1, marginHorizontal: 4 }}
                      >
                        <View
                          style={[
                            styles.roleButton,
                            {
                              backgroundColor: "#1e293b",
                              borderColor: "#1e293b",
                            },
                          ]}
                        >
                          <Feather name={r.icon} size={16} color="#94a3b8" />
                          <Text style={styles.roleText}>{r.label}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                  {/* Name & Email */}
                  <View style={styles.row}>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Full Name <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="user"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.name}
                          onChangeText={(val) => handleChange("name", val)}
                          placeholder="Name"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                      {errors.name && (
                        <Text style={styles.errorText}>{errors.name}</Text>
                      )}
                    </View>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Email <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="mail"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.email}
                          onChangeText={(val) => handleChange("email", val)}
                          placeholder="Email"
                          placeholderTextColor="#64748b"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      {errors.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>
                  </View>

                  {/* Phone & Age */}
                  <View style={styles.row}>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Phone <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="phone"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.phone}
                          onChangeText={(val) => handleChange("phone", val)}
                          placeholder="Phone"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                        />
                      </View>
                      {errors.phone && (
                        <Text style={styles.errorText}>{errors.phone}</Text>
                      )}
                    </View>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Age <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="calendar"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.age}
                          onChangeText={(val) => handleChange("age", val)}
                          placeholder="Age"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                        />
                      </View>
                      {errors.age && (
                        <Text style={styles.errorText}>{errors.age}</Text>
                      )}
                    </View>
                  </View>

                  {/* Dept & College */}
                  <View style={styles.row}>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Dept <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="book"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.department}
                          onChangeText={(val) =>
                            handleChange("department", val)
                          }
                          placeholder="Dept"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                      {errors.department && (
                        <Text style={styles.errorText}>
                          {errors.department}
                        </Text>
                      )}
                    </View>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        College <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="award"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.college}
                          onChangeText={(val) => handleChange("college", val)}
                          placeholder="College"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                      {errors.college && (
                        <Text style={styles.errorText}>{errors.college}</Text>
                      )}
                    </View>
                  </View>

                  {/* Passwords */}
                  <View style={styles.row}>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Password <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="lock"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.password}
                          onChangeText={(val) => handleChange("password", val)}
                          placeholder="Password"
                          placeholderTextColor="#64748b"
                          secureTextEntry={!showPassword}
                        />
                      </View>
                      {errors.password && (
                        <Text style={styles.errorText}>{errors.password}</Text>
                      )}
                    </View>
                    <View style={styles.halfInputContainer}>
                      <Text style={styles.label}>
                        Confirm <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="lock"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.confirmPassword}
                          onChangeText={(val) =>
                            handleChange("confirmPassword", val)
                          }
                          placeholder="Confirm"
                          placeholderTextColor="#64748b"
                          secureTextEntry={!showConfirmPassword}
                        />
                      </View>
                      {errors.confirmPassword && (
                        <Text style={styles.errorText}>
                          {errors.confirmPassword}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Class Group & Address */}
                  <View style={styles.row}>
                    {role === "student" && (
                      <View style={styles.halfInputContainer}>
                        <Text style={styles.label}>
                          Class / Group{" "}
                          <Text style={{ color: "#8b5cf6" }}>*</Text>
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 5,
                            backgroundColor: "#0f172a",
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#334155",
                            paddingHorizontal: 5,
                          }}
                        >
                          <Feather
                            name="chevron-left"
                            size={16}
                            color="#64748b"
                          />
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ flex: 1, paddingVertical: 5 }}
                          >
                            {availableClasses.map((c) => (
                              <TouchableOpacity
                                key={c._id}
                                style={[
                                  {
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    marginRight: 8,
                                    borderColor: "#334155",
                                    backgroundColor: "#1e293b",
                                  },
                                  formData.classGroup === c.name && {
                                    borderColor: "#a78bfa",
                                    backgroundColor: "#4c1d95",
                                  },
                                ]}
                                onPress={() =>
                                  handleChange("classGroup", c.name)
                                }
                              >
                                <Text
                                  style={{
                                    color:
                                      formData.classGroup === c.name
                                        ? "white"
                                        : "#94a3b8",
                                    fontSize: 12,
                                  }}
                                >
                                  {c.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <Feather
                            name="chevron-right"
                            size={16}
                            color="#64748b"
                          />
                        </View>
                        {errors.classGroup && (
                          <Text style={styles.errorText}>
                            {errors.classGroup}
                          </Text>
                        )}
                      </View>
                    )}
                    <View
                      style={[
                        styles.halfInputContainer,
                        role !== "student" && { width: "100%" },
                      ]}
                    >
                      <Text style={styles.label}>
                        Address <Text style={{ color: "#8b5cf6" }}>*</Text>
                      </Text>
                      <View style={styles.inputBox}>
                        <Feather
                          name="map-pin"
                          size={16}
                          color="#8b5cf6"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          value={formData.address}
                          onChangeText={(val) => handleChange("address", val)}
                          placeholder="Address"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                      {errors.address && (
                        <Text style={styles.errorText}>{errors.address}</Text>
                      )}
                    </View>
                  </View>

                  {error && (
                    <View style={styles.serverError}>
                      <Text style={styles.serverErrorText}>⚠️ {error}</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
                    <LinearGradient
                      colors={["#8b5cf6", "#3b82f6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.submitButton,
                        {
                          backgroundColor: "transparent",
                          flexDirection: "row",
                          gap: 10,
                        },
                        isLoading && styles.disabledButton,
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Text style={styles.submitButtonText}>Send OTP</Text>
                          <Feather name="send" size={18} color="white" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate("Login")}
                    style={styles.loginLink}
                  >
                    <Text style={styles.loginText}>
                      Already have an account?{" "}
                      <Text style={styles.loginTextBold}>Login here</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    dispatch(clearError());
                    setOtp("");
                  }}
                  style={styles.backBtnCircle}
                >
                  <Feather name="arrow-left" size={20} color="#8b5cf6" />
                </TouchableOpacity>

                <View style={styles.headerContainer}>
                  <View
                    style={[
                      styles.iconWrapper,
                      {
                        backgroundColor: "rgba(139, 92, 246, 0.15)",
                        borderColor: "rgba(139, 92, 246, 0.3)",
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Feather name="shield" size={32} color="#8b5cf6" />
                  </View>
                  <Text style={styles.title}>Check Your Email</Text>
                  <Text style={styles.subtitle}>
                    {role !== "student" ||
                    loginRole === "teacher" ||
                    loginRole === "admin"
                      ? "We've sent one OTP to your email and another to Admin."
                      : "We've sent a 6-digit code to"}
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: "#8b5cf6", fontWeight: "700", marginTop: 4 },
                    ]}
                  >
                    {formData.email || loginEmail}
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  <Text
                    style={[
                      styles.label,
                      { textAlign: "center", marginBottom: 4 },
                    ]}
                  >
                    {role !== "student" ? "Your OTP" : "Enter OTP"}
                  </Text>
                  <View style={styles.otpContainer}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => otpInputRef.current?.focus()}
                      style={styles.otpBoxesRow}
                    >
                      {renderOtpBoxes(otp)}
                    </TouchableOpacity>
                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenOtpInput}
                      value={otp}
                      onChangeText={(val) =>
                        setOtp(val.replace(/\D/g, "").slice(0, 6))
                      }
                      keyboardType="numeric"
                      maxLength={6}
                      caretHidden={true}
                      selectTextOnFocus={false}
                      autoFocus
                    />
                  </View>
                  {errors.otp && (
                    <Text style={[styles.errorText, { textAlign: "center" }]}>
                      {errors.otp}
                    </Text>
                  )}

                  {role !== "student" && (
                    <>
                      <Text
                        style={[
                          styles.label,
                          {
                            textAlign: "center",
                            marginTop: 15,
                            marginBottom: 4,
                          },
                        ]}
                      >
                        Admin OTP
                      </Text>
                      <View style={styles.otpContainer}>
                        <TouchableOpacity
                          activeOpacity={1}
                          onPress={() => adminOtpInputRef.current?.focus()}
                          style={styles.otpBoxesRow}
                        >
                          {renderOtpBoxes(adminOtp)}
                        </TouchableOpacity>
                        <TextInput
                          ref={adminOtpInputRef}
                          style={styles.hiddenOtpInput}
                          value={adminOtp}
                          onChangeText={(val) =>
                            setAdminOtp(val.replace(/\D/g, "").slice(0, 6))
                          }
                          keyboardType="numeric"
                          maxLength={6}
                          caretHidden={true}
                          selectTextOnFocus={false}
                        />
                      </View>
                      {errors.adminOtp && (
                        <Text
                          style={[styles.errorText, { textAlign: "center" }]}
                        >
                          {errors.adminOtp}
                        </Text>
                      )}
                    </>
                  )}

                  <View style={styles.validityBadge}>
                    <Feather name="shield" size={15} color="#8b5cf6" />
                    <Text style={styles.validityText}>
                      Your code is valid for 10 minutes
                    </Text>
                  </View>

                  {error && (
                    <View style={styles.serverError}>
                      <Feather name="alert-circle" size={16} color="#ef4444" />
                      <Text style={styles.serverErrorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      {
                        backgroundColor: "#10b981",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8,
                      },
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={handleVerifyOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Feather name="lock" size={18} color="white" />
                        <Text style={styles.submitButtonText}>
                          Verify & Register
                        </Text>
                        <Feather name="chevron-right" size={20} color="white" />
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>
                      Didn&apos;t receive the code?{" "}
                    </Text>
                    <TouchableOpacity onPress={handleResendOTP}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text style={styles.resendLink}>Resend Code</Text>
                        <Feather name="refresh-cw" size={14} color="#8b5cf6" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 24,
    padding: 25,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.5)",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  headerContainer: { alignItems: "center", marginBottom: 25 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "white", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  rolesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  formContainer: { width: "100%" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  halfInputContainer: { width: "48%" },
  fullInputContainer: { width: "100%", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#e2e8f0", marginBottom: 6 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    borderRadius: 14,
    height: 48,
  },
  inputIcon: { paddingLeft: 12, marginRight: 8 },
  input: { flex: 1, color: "white", fontSize: 13, height: "100%" },
  errorText: { color: "#f87171", fontSize: 11, marginTop: 2 },
  serverError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  serverErrorText: { color: "#f87171", fontSize: 13 },
  submitButton: {
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { color: "white", fontSize: 15, fontWeight: "bold" },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginText: { color: "#94a3b8", fontSize: 13 },
  loginTextBold: { color: "#8b5cf6", fontWeight: "bold" },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    marginBottom: 5,
  },

  /* OTP Verification UI styles */
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  otpContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 12,
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 6,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  otpDigit: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.01,
    color: "transparent",
    backgroundColor: "transparent",
  },
  validityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  validityText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  resendLink: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "700",
  },
});
