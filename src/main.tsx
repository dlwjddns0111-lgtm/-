import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Load Kakao SDK before rendering
const script = document.createElement('script');
script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
script.async = false;
document.head.appendChild(script);

script.onload = () => {
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
