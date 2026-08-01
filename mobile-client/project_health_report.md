# Exam-Hub App Health Check

I have reviewed the architecture and codebase of the `mobile-client` and backend server. Here are the primary issues and potential bugs you should be aware of:

## 1. Hosting Limitations (Vercel Serverless vs WebSockets)
> [!WARNING]
> Your backend is currently hosted on Vercel. Vercel is a "serverless" environment, which means it spins up servers for milliseconds at a time and then kills them. **This completely breaks Socket.IO WebSockets.**

*   **Impact:** Real-time features (like "typing..." indicators, instant read receipts, and real-time push notifications) natively rely on Socket.io. Because Vercel kills the connections, these features fail silently.
*   **Current Fix:** We successfully implemented a background "polling" fallback in `ChatRoomScreen.js` that checks for messages every 1 second. 
*   **Recommendation:** If you want true WhatsApp-level real-time performance in the future, you will eventually need to host your backend on a platform that supports long-running Node.js processes (like **Render, Heroku, or DigitalOcean**), or use a third-party service like **Pusher** or **Socket.io on AWS API Gateway**.

## 2. Android Keyboard Layout Engine
> [!NOTE]
> Android has a known native bug where using a `translucent={true}` Status Bar completely breaks the operating system's ability to resize the window when the keyboard opens (`adjustResize`).

*   **Impact:** This is what caused the massive white/black gaps in the chat room. 
*   **Current Fix:** We removed the translucent property specifically for the `ChatRoomScreen`, allowing the keyboard to work flawlessly. 
*   **Recommendation:** The `DashboardScreen` and `ChatListScreen` still use translucent status bars. Since they don't have bottom-docked text inputs, they should be fine. However, if you ever add text inputs at the bottom of those screens, you will encounter the exact same bug. 

## 3. Expo Push Notifications
> [!IMPORTANT]
> Your app requests notification permissions (`android.permission.POST_NOTIFICATIONS`), but for push notifications to work in a production APK/AAB, you need proper Firebase Cloud Messaging (FCM) credentials.

*   **Impact:** When you build the final `.apk` or publish to the Google Play Store, notifications might silently fail to deliver if `google-services.json` and EAS build credentials are not perfectly aligned.
*   **Recommendation:** Make sure your Expo project is linked to an EAS account (`npx expo login` -> `eas init`) and your Firebase credentials are valid before launching to real users.

---

### Overall Health
Aside from the Vercel/WebSocket limitation, the Redux architecture and React Native code are actually very solid and clean! If you are satisfied with the current chat performance via our polling fix, we can consider these bugs successfully patched.
