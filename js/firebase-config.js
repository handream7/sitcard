// 제공해주신 Firebase 웹 앱의 구성 정보
const firebaseConfig = {
  apiKey: "AIzaSyBHeYfGscNFFPubAJhWwadPINmLeZcbHLg",
  authDomain: "sitcard-afecc.firebaseapp.com",
  // Realtime Database를 사용하기 위해 databaseURL을 명시적으로 추가합니다.
  databaseURL: "https://sitcard-afecc-default-rtdb.firebaseio.com", 
  projectId: "sitcard-afecc",
  storageBucket: "sitcard-afecc.appspot.com",
  messagingSenderId: "317820478124",
  appId: "1:317820478124:web:6e4719800ad5175da3b509",
  measurementId: "G-6FXWJ92NQZ"
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// Firebase Realtime Database 참조 (main.js에서 사용)
const database = firebase.database();