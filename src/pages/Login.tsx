import { useState, useEffect } from 'react';
import { signInWithGoogle, login as saveUser } from '../lib/auth';
import { syncFromCloud } from '../lib/sync';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
    const [isLoading, setIsLoading] = useState(false);

    // 0. KakaoTalk 인앱브라우저 탈출
    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.match(/kakaotalk/i) && userAgent.match(/android/i)) {
            location.href = 'intent://' + location.href.replace(/https?:\/\//i, '') + '#Intent;scheme=https;package=com.android.chrome;end';
        }
    }, []);

    const handleKakaoLogin = () => {
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            alert('카카오 SDK 초기화 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        setIsLoading(true);
        window.Kakao.Auth.login({
            success: function(authObj: any) {
                console.log('Kakao Login Success:', authObj);
                fetchKakaoUserInfo();
            },
            fail: function(err: any) {
                console.error('Kakao Login Fail:', err);
                setIsLoading(false);
                alert('카카오 로그인에 실패했습니다.');
            },
        });
    };

    const fetchKakaoUserInfo = () => {
        window.Kakao.API.request({
            url: '/v2/user/me',
            success: async function(res: any) {
                try {
                    const userData = res;
                    const kakaoAccount = userData.kakao_account || {};
                    const profile = kakaoAccount.profile || {};

                    const user = {
                        id: `kakao:${userData.id}`,
                        email: kakaoAccount.email || `kakao_${userData.id}@payroll.app`,
                        name: profile.nickname || 'Kakao User',
                        photoUrl: profile.profile_image_url || '',
                    };

                    saveUser(user);
                    await syncFromCloud();
                    onLogin();
                } catch (error) {
                    console.error('Error processing Kakao user info:', error);
                    alert('사용자 정보 처리 중 오류가 발생했습니다.');
                } finally {
                    setIsLoading(false);
                }
            },
            fail: function(error: any) {
                console.error('Kakao API Request Fail:', error);
                setIsLoading(false);
                alert('카카오 사용자 정보를 가져오는데 실패했습니다.');
            }
        });
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const user = await signInWithGoogle();
            saveUser(user);
            await syncFromCloud();
            onLogin();
        } catch (error: any) {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white relative overflow-hidden">
            {/* Background decorative elements - Very subtle */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/30 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50/30 rounded-full blur-[120px]" />

            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 relative z-10">
                <div className="flex flex-col items-center">
                    <div className="w-44 h-44 relative rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1A365D]">
                            <img 
                                src="/logo_final_v3.jpg?v=3.3" 
                                className="w-full h-full object-cover scale-[1.15] transition-transform duration-700" 
                                alt="사장님 인건비 관리 로고" 
                            />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                        사장님, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">반갑습니다!</span>
                    </h2>
                    <p className="text-gray-500 font-medium text-lg">매장 인건비 관리를 더 똑똑하게</p>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isLoading} 
                        className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-50 py-5 rounded-2xl text-lg font-bold text-gray-900 border border-gray-200 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isLoading ? <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" /> : 
                        <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" /><span>구글 계정으로 로그인</span></>}
                    </button>

                    <button 
                        onClick={handleKakaoLogin} 
                        disabled={isLoading} 
                        className="w-full flex items-center justify-center gap-4 bg-[#FEE500] hover:bg-[#FADC00] py-5 rounded-2xl text-lg font-bold text-black shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isLoading ? <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" /> : 
                        <><svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 3C5.373 3 0 7.373 0 12.768c0 3.384 2.164 6.368 5.474 8.16-.275 1.018-1.002 3.693-1.144 4.254-.18.71.26.702.553.513.228-.146 3.635-2.464 4.29-2.91.603.088 1.226.134 1.827.134 6.627 0 12-4.373 12-9.768S16.627 3 12 3z" /></svg><span>카카오로 1초 로그인</span></>}
                    </button>
                </div>
            </div>
            
            <div className="p-8 text-center relative z-10">
                <p className="text-[10px] text-gray-300 font-medium tracking-widest uppercase">
                    Secure Cloud Sync Enabled
                </p>
            </div>
        </div>
    );
}
