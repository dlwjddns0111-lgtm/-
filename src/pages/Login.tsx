import { useState, useEffect } from 'react';
import { signInWithGoogle, login as saveUser } from '../lib/auth';
import { syncFromCloud } from '../lib/sync';
import { LogIn, ShieldCheck, Cloud } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
    const [isLoading, setIsLoading] = useState(false);

    // 0. Detect KakaoTalk In-App Browser (Android) and Force Escape
    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.match(/kakaotalk/i)) {
            if (userAgent.match(/android/i)) {
                location.href = 'intent://' + location.href.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
            }
        }
    }, []);

    // 1. Initialize Kakao SDK
    useEffect(() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init('c08198942354373e24f7f57c7a79b21b');
        }
    }, []);

    // 2. Handle Google Login
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const user = await signInWithGoogle();
            saveUser(user);
            await syncFromCloud();
            onLogin();
        } catch (error: any) {
            console.error('Google Login Error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                setIsLoading(false);
                return;
            }
            const errorMsg = error.code ? `(${error.code}) ${error.message}` : String(error);
            alert('구글 로그인 실패: ' + errorMsg);
            setIsLoading(false);
        }
    };

    // 3. Handle Kakao Login
    const handleKakaoLogin = () => {
        setIsLoading(true);
        window.Kakao.Auth.login({
            success: function (authObj: any) {
                window.Kakao.API.request({
                    url: '/v2/user/me',
                    success: async function (res: any) {
                        const kakaoAccount = res.kakao_account || {};
                        const profile = kakaoAccount.profile || {};
                        const user = {
                            id: `kakao:${res.id}`,
                            email: kakaoAccount.email || `kakao_${res.id}@payroll.app`,
                            name: profile.nickname || 'Kakao User',
                            photoUrl: profile.thumbnail_image_url || '',
                        };
                        saveUser(user);
                        await syncFromCloud();
                        onLogin();
                        setIsLoading(false);
                    },
                    fail: function (error: any) {
                        console.error(error);
                        alert('사용자 정보 요청 실패');
                        setIsLoading(false);
                    },
                });
            },
            fail: function (err: any) {
                console.error(err);
                setIsLoading(false);
            },
        });
    };

    return (
        <div className="flex flex-col h-screen bg-[#F4F1EA]">
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
                {/* Logo Section */}
                <div className="flex flex-col items-center space-y-6">
                    <div className="w-24 h-24 bg-[#FF90E8] border-4 border-black rounded-3xl flex items-center justify-center shadow-[8px_8px_0px_#000] rotate-3 transform transition-transform hover:rotate-0">
                        <ShieldCheck className="w-14 h-14 text-black" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-black/60 uppercase tracking-widest mt-2 bg-[#FFC900] px-2 border-2 border-black inline-block shadow-[2px_2px_0px_#000]">
                            인건비 & 매장 관리
                        </p>
                    </div>
                </div>

                {/* Welcome Text */}
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-black text-black italic">사장님, 환영합니다!</h2>
                    <p className="text-black/60 font-black text-lg">편리하게 인건비를 관리해보세요</p>
                </div>

                {/* Login Button */}
                <div className="w-full max-w-sm space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="neo-btn w-full flex items-center justify-center gap-4 bg-white py-5 text-xl"
                    >
                        {isLoading ? (
                            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                                <span className="font-black">구글 계정으로 시작하기</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleKakaoLogin}
                        disabled={isLoading}
                        className="neo-btn w-full flex items-center justify-center gap-4 bg-[#FEE500] py-5 text-xl text-[#000000] opacity-100"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-4 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                                    <path d="M12 3C5.373 3 0 7.373 0 12.768c0 3.384 2.164 6.368 5.474 8.16-.275 1.018-1.002 3.693-1.144 4.254-.18.71.26.702.553.513.228-.146 3.635-2.464 4.29-2.91.603.088 1.226.134 1.827.134 6.627 0 12-4.373 12-9.768S16.627 3 12 3z" />
                                </svg>
                                <span className="font-black">카카오로 시작하기</span>
                            </>
                        )}
                    </button>

                    <p className="text-[12px] text-center text-black/40 font-black leading-tight mt-4">
                        로그인 시 <span className="underline cursor-pointer">이용약관</span> 및 <br />
                        <span className="underline cursor-pointer">개인정보처리방침</span>에 동의하게 됩니다.
                    </p>
                </div>
            </div>

            {/* Footer Background Decoration */}
            <div className="h-12 border-t-4 border-black bg-[#FFC900]" />
        </div>
    );
}

declare global {
    interface Window {
        Kakao: any;
    }
}
