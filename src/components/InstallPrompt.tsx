import { useState, useEffect } from 'react';
import { Download, X, MoreVertical, PlusSquare } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isIOS, setIsIOS] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isInApp = /KAKAOTALK|Line|in-app|NAVER/.test(userAgent);

        setIsIOS(isIOSDevice);
        setIsInAppBrowser(isInApp);

        // Check if event already fired (captured by global listener if we add one in main.tsx,
        // but for now let's just use the window property hack if we decide to add it,
        // or just rely on standard listener but be safer)

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Optionally auto-show if desired, but we keep it ready
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Also check if we missed it?
        // (Browser usually holds it until handled, but let's be safe)

        // Hide if already in standalone mode
        if ((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Direct Install
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsVisible(false);
            }
        } else {
            // Manual Fallback (Native Alert is clearer for "why isn't it working")
            alert("⚠️ 자동 설치가 안되는 브라우저입니다.\n\n[해결책]\n화면 우측 상단/하단 '점 3개' 메뉴 클릭\n→ '앱 설치' 또는 '홈 화면에 추가'를 직접 눌러주세요!");
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <button
                onClick={handleInstallClick}
                className="w-full bg-[#FFC900] text-black font-black py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-3 text-xl"
            >
                <Download size={28} strokeWidth={3} />
                {deferredPrompt ? "앱 다운로드 받기" : "앱 다운로드 (수동)"}
            </button>

            {/* Close Button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute -top-3 -right-3 bg-black text-white p-2 rounded-full shadow-lg"
            >
                <X size={16} />
            </button>
        </div>
    );
}
