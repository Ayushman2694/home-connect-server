// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

// 🔑 Same Firebase config as HTML
const firebaseConfig = {
  apiKey: "AIzaSyAvSq53bVmruxVU93ruY8HG_Hznc1uxj7s",
  authDomain: "home-connect-4ca0c.firebaseapp.com",
  databaseURL: "https://home-connect-4ca0c-default-rtdb.firebaseio.com",
  projectId: "home-connect-4ca0c",
  storageBucket: "home-connect-4ca0c.firebasestorage.app",
  messagingSenderId: "283441779952",
  appId: "1:283441779952:web:6973a6a3ef03fe3f5ade35",
  measurementId: "G-CY1DHCCVGF",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Optional: handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
});
