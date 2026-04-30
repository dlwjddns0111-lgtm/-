import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

// Force immediate update of Service Worker
registerSW({
  onNeedRefresh() {
    if (confirm('새로운 버전이 업데이트되었습니다. 지금 반영할까요?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Load Kakao SDK before rendering
const script = document.createElement('script');
script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
script.async = false;
document.head.appendChild(script);

script.onload = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY);
        console.log('Kakao SDK Initialized');
    }
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <App />
    )
};

script.onerror = () => {
    console.error('Failed to load Kakao SDK');
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <App />
    )
};
