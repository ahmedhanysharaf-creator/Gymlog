/* ============================================
   GymLog — Firebase Configuration
   ============================================ */

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCwX97Arg1BjKSpxVcKXHGbdRFg6cjUbO4",
  authDomain: "gymlog-be53a.firebaseapp.com",
  projectId: "gymlog-be53a",
  storageBucket: "gymlog-be53a.firebasestorage.app",
  messagingSenderId: "1051728223608",
  appId: "1:1051728223608:web:bc554feef425788070bc8d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence so the app works without internet
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open. Only one tab can use offline persistence at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available in this browser.');
  }
});

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
