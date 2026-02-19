import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBHYCdC9amtGrH1bM9solO4shqm-XS4NOg',
  authDomain: 'tsuri-sugoroku.firebaseapp.com',
  projectId: 'tsuri-sugoroku',
  storageBucket: 'tsuri-sugoroku.firebasestorage.app',
  messagingSenderId: '1054360294742',
  appId: '1:1054360294742:web:3c1b04c992fd167c8672f7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// パスワード検証専用の副インスタンス（メインのログイン状態に影響しない）
const verifyApp = initializeApp(firebaseConfig, 'verify');
export const verifyAuth = getAuth(verifyApp);
