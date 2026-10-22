// Public Firebase web-app identifiers from the Nourish Firebase Console.
// Access to private plans is controlled by Firebase Authentication and Firestore Security Rules.
// Never place private keys, passwords or service-account credentials in this file.
window.NOURISH_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFZgQLrBVeGkXwfXeSL6NwkzMfh-5Pm9k",
  authDomain: "nourish-planner-116e7.firebaseapp.com",
  projectId: "nourish-planner-116e7",
  storageBucket: "nourish-planner-116e7.firebasestorage.app",
  messagingSenderId: "108675069931",
  appId: "1:108675069931:web:06a08a89b898d57cdecbae"
};

// FORGE bootstrap: load the presentation layer on the very first page visit.
// This deliberately does not depend on the service worker controlling the page.
(()=>{
  const files=['forge-original-theme.js','forge-master-ui.js','forge-train.js','forge-fuel.js','forge-activity.js'];
  for(const file of files){
    if(document.querySelector(`script[src*="${file}"]`)) continue;
    const script=document.createElement('script');
    script.src=`./${file}?v=20`;
    script.dataset.forgeBootstrap='1';
    document.head.appendChild(script);
  }
})();
