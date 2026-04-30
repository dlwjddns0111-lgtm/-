import { useEffect, useState } from 'react';
import { 
    User as UserIcon, Bell, Globe, PlayCircle, 
    Shield, HelpCircle, LogOut, ChevronRight,
    Sun, Moon, Monitor, Palette, Cloud
} from 'lucide-react';
import { getUser, User } from '../lib/auth';
import { getSettings } from '../lib/storage';
import { Settings } from '../types';
import { useTheme } from '../lib/theme';
import { useLanguage, getTranslations } from '../lib/language';
import { clsx } from 'clsx';

export default function SettingsPage({ onLogout }: { onLogout: () => void }) {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const t = getTranslations(language);

    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);

    // Modal states
    const [activeModal, setActiveModal] = useState<'profile' | 'notification' | 'language' | 'guide' | 'privacy' | 'help' | null>(null);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [notificationSound, setNotificationSound] = useState(t.soundDefault);

    useEffect(() => {
        setUser(getUser());
        setSettings(getSettings());
    }, []);

    const handleNotImplemented = () => {
        alert('준비 중인 기능입니다.');
    };

    if (!settings) return null;

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-gray-950 overflow-y-auto relative">
            <div className="p-4 sm:p-6 pb-24 space-y-8 max-w-2xl mx-auto w-full mt-4">
                
                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-gray-800">
                    <img 
                        src={user?.photoUrl || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&q=80"} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&q=80";
                        }}
                    />
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{user?.name || '사용자'}</h2>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                                {user?.email?.includes('@payroll.app') ? '카카오 로그인 연동됨' : (user?.email || '이메일 없음')}
                            </p>
                            <div className="flex items-center gap-1">
                                <span className="text-[13px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1 shrink-0">
                                    👦 {t.profileCard}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 계정 */}
                <div>
                    <h3 className="text-[13px] font-bold text-gray-500 dark:text-gray-400 mb-3 ml-2">{t.account}</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <MenuItem icon={<UserIcon className="w-[22px] h-[22px]" />} label={t.profileSettings} onClick={() => setActiveModal('profile')} />
                        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-5" />
                        <MenuItem icon={<Bell className="w-[22px] h-[22px]" />} label={t.notifications} onClick={() => setActiveModal('notification')} />
                        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-5" />
                        <MenuItem icon={<Globe className="w-[22px] h-[22px]" />} label={t.langMenu} onClick={() => setActiveModal('language')} />
                    </div>
                </div>

                {/* 지원 */}
                <div>
                    <h3 className="text-[13px] font-bold text-gray-500 dark:text-gray-400 mb-3 ml-2">{t.support}</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <MenuItem icon={<PlayCircle className="w-[22px] h-[22px]" />} label={t.guide} onClick={() => setActiveModal('guide')} />
                        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-5" />
                        <MenuItem icon={<Shield className="w-[22px] h-[22px]" />} label={t.privacy} onClick={() => setActiveModal('privacy')} />
                        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-5" />
                        <MenuItem icon={<HelpCircle className="w-[22px] h-[22px]" />} label={t.help} onClick={() => setActiveModal('help')} />
                    </div>
                </div>

                {/* 로그아웃 */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-8">
                    <button 
                        onClick={() => {
                            if (confirm('정말 로그아웃 하시겠습니까?')) {
                                onLogout();
                            }
                        }}
                        className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-900 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors active:bg-red-50 dark:active:bg-red-950/50"
                    >
                        <div className="flex items-center gap-3.5 text-red-500">
                            <LogOut className="w-[22px] h-[22px]" />
                            <span className="font-semibold text-[15px]">{t.logout}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    </button>
                </div>
            </div>

            {/* --- Modals --- */}
            {activeModal === 'profile' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-200 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">프로필 설정</h2>
                        <button onClick={() => setActiveModal(null)} className="p-2 -mr-2 text-blue-500 font-bold hover:text-blue-600">
                            저장
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="flex justify-center">
                            <div className="relative">
                                <img src={user?.photoUrl || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&q=80"} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-gray-800 bg-gray-50 dark:bg-gray-800" />
                                <button className="absolute bottom-0 right-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                                    <UserIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 ml-1">이름</label>
                                <input type="text" defaultValue={user?.name || ''} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 ml-1">연결된 계정</label>
                                <div className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-400 dark:text-gray-500 italic">
                                    {user?.email?.includes('@payroll.app') ? '카카오 로그인 (이메일 비공개)' : (user?.email || '이메일 없음')}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 ml-1">상태 메시지</label>
                                <textarea rows={3} placeholder="상태 메시지를 입력하세요" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm resize-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'notification' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-200 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">알림 설정</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-bold text-[15px] text-gray-900 dark:text-gray-100">푸시 알림</h3>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">앱의 주요 알림을 받습니다</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-12 h-7 bg-gray-100 dark:bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-200 after:border-gray-200 dark:after:border-gray-700 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500 border border-gray-200 dark:border-gray-700"></div>
                            </label>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 space-y-4">
                            <h3 className="font-bold text-[15px] text-gray-900 dark:text-gray-100 mb-1">알림음 선택</h3>
                            <div className="space-y-1">
                                {['기본음', '차임벨', '삐빅'].map(sound => (
                                    <label key={sound} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{sound}</span>
                                        <input type="radio" name="sound" checked={notificationSound === sound} onChange={() => setNotificationSound(sound)} className="w-5 h-5 text-blue-500 focus:ring-blue-500" />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'language' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-200 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">언어 (Language)</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            {[
                                { id: '한국어', label: '한국어 (Korean)' },
                                { id: '영어', label: 'English (US)' },
                                { id: '일본어', label: '日本語 (Japanese)' },
                            ].map((lang, index, arr) => (
                                <div key={lang.id}>
                                    <label className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <span className="font-semibold text-[15px] text-gray-800 dark:text-gray-200">{lang.label}</span>
                                        <input type="radio" name="language" checked={language === lang.id} onChange={() => setLanguage(lang.id as '한국어' | '영어' | '일본어')} className="w-5 h-5 text-blue-500 focus:ring-blue-500" />
                                    </label>
                                    {index < arr.length - 1 && <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-5" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'guide' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-300 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                            <span className="text-[15px] font-bold">닫기</span>
                        </button>
                        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900 dark:text-gray-100">프리미엄 사용 가이드</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
                        <header className="space-y-3 pb-4">
                            <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 leading-tight">사장님을 위한<br /><span className="text-blue-500 text-4xl">완벽 운영 매뉴얼</span> 📑</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed text-sm">실제 앱 화면을 통해 쉽고 빠르게 마스터하세요.</p>
                        </header>
                        
                        <div className="space-y-4">
                            <GuideAccordionItem 
                                number="1" 
                                title="홈 화면: 급여 그래프와 매장명" 
                                image="/real_guide_1_home.png"
                                content={
                                    <div className="space-y-4">
                                        <p>홈 화면은 사장님 매장의 경영 지표를 한눈에 보여줍니다. 상단에 **'날마다잔치날전집'**처럼 매장 이름을 설정하여 전문성을 높이세요.</p>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 space-y-2">
                                            <h5 className="font-bold text-blue-900 dark:text-blue-300 text-xs">📊 그래프 해석 가이드</h5>
                                            <ul className="text-xs text-blue-700/80 dark:text-blue-400/80 space-y-1.5 font-medium">
                                                <li>• **이번 달 예상 인건비**: 현재까지 기록된 근태를 바탕으로 월말에 지급할 총액을 미리 예측합니다.</li>
                                                <li>• **월별 추이**: 최근 4개월간의 인건비 변화를 그래프로 비교하여 인력 배치를 조절할 수 있습니다.</li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                            />

                            <GuideAccordionItem 
                                number="2" 
                                title="직원 등록: 4대보험 및 수당 설정" 
                                image="/final_v720_guide_2.png"
                                content={
                                    <div className="space-y-4">
                                        <p>직원별로 정교한 급여 체계를 설정할 수 있습니다. **'쭈아'**님 사례처럼 연락처, 시급, 전용 색상을 지정하세요.</p>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-2">
                                            <h5 className="font-bold text-indigo-900 dark:text-indigo-300 text-xs">⚙️ 필수 설정 항목</h5>
                                            <ul className="text-xs text-indigo-700/80 dark:text-indigo-400/80 space-y-1.5 font-medium">
                                                <li>• **급여 체계**: 시급제(예: 11,000원)와 월급제를 선택할 수 있습니다.</li>
                                                <li>• **수당 및 보험**: 주휴수당, 4대보험 여부를 간단히 선택하세요.</li>
                                                <li>• **보안 안내**: 사장님의 보안을 위해 전화번호 부분만 블러 처리하였습니다. 이름과 급여는 그대로 확인 가능합니다.</li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                            />

                            <GuideAccordionItem 
                                number="3" 
                                title="근태 기록: 캘린더 현황과 메모" 
                                image="/real_guide_3_calendar.png"
                                content={
                                    <div className="space-y-4">
                                        <p>캘린더에서는 모든 직원의 근무 현황을 날짜별로 보여줍니다. 직원별 고유 색상이 적용되어 구분이 매우 쉽습니다.</p>
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/50 space-y-2">
                                            <h5 className="font-bold text-purple-900 dark:text-purple-300 text-xs">📝 캘린더 100% 활용하기</h5>
                                            <ul className="text-xs text-purple-700/80 dark:text-purple-400/80 space-y-1.5 font-medium">
                                                <li>• **직원별 구분**: '박서현', '쭈아', '박시유'님처럼 이름과 색상으로 근태가 표시됩니다.</li>
                                                <li>• **사장님 메모**: **'18시 20명 단체'**처럼 잊지 말아야 할 내용을 날짜별로 남겨두세요.</li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                            />

                            <GuideAccordionItem 
                                number="4" 
                                title="급여 관리: 월간 정산 및 실지급액" 
                                image="/real_guide_4_payroll.png"
                                content={
                                    <div className="space-y-4">
                                        <p>[정산] 탭은 사장님의 지출 총액과 직원이 실제 가져갈 금액을 명확히 보여줍니다.</p>
                                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800/50 space-y-2">
                                            <h5 className="font-bold text-green-900 dark:text-green-300 text-xs">💰 정산서 핵심 포인트</h5>
                                            <ul className="text-xs text-green-700/80 dark:text-green-400/80 space-y-1.5 font-medium">
                                                <li>• **실지급액 요약**: 기본급에서 공제 항목을 뺀 실제 금액(예: 999,878원)을 확인하세요.</li>
                                                <li>• **전체 결산**: 하단의 합계를 통해 이번 달 매장 예산을 체크하세요.</li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                            />

                            <GuideAccordionItem 
                                number="5" 
                                title="명세서 공유: 카톡 전송" 
                                image="/real_guide_5_share.png"
                                content={
                                    <div className="space-y-4">
                                        <p>정산 내역을 깔끔한 명세서 이미지로 만들어 직원에게 즉시 보낼 수 있습니다.</p>
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-800/50 space-y-2">
                                            <h5 className="font-bold text-yellow-900 dark:text-yellow-600 text-xs">💬 신뢰받는 사장님의 비결</h5>
                                            <ul className="text-xs text-yellow-700/80 dark:text-yellow-600/80 space-y-1.5 font-medium">
                                                <li>• **카톡 전송**: 노란색 버튼을 누르면 즉시 명세서가 전송됩니다.</li>
                                                <li>• **투명한 소통**: 총 근무 시간과 공제 내역을 투명하게 공유하여 신뢰를 쌓으세요.</li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                            />
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl flex items-center justify-between border border-gray-200/50 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <Cloud className="w-4 h-4 text-blue-500" />
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">사장님의 모든 데이터는 실시간으로 클라우드 보호 중입니다.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'privacy' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-300 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                            <span className="text-[15px] font-bold">닫기</span>
                        </button>
                        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900 dark:text-gray-100">개인정보 처리방침</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed space-y-8 pb-24">
                        <section className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                            <h3 className="font-black text-gray-900 dark:text-gray-100 text-lg">핵심 요약 📋</h3>
                            <ul className="space-y-2 font-bold text-gray-500">
                                <li>• 수집 항목: 이름, 이메일, 프로필 사진, 매장 기록</li>
                                <li>• 보관 목적: 데이터 동기화 및 급여 계산 서비스 제공</li>
                                <li>• 보안 유지: SSL 암호화 전송 및 안전한 서버 보관</li>
                            </ul>
                        </section>

                        <div className="space-y-8 px-1">
                            <PrivacySection title="제1조 (개인정보의 처리 목적)" content="급여박사는 사용자의 효율적인 노무 관리를 돕기 위해 개인정보를 처리합니다. 수집된 정보는 앱 내 기능 제공, 고객 상담 응대, 서비스 품질 개선 목적으로만 한정하여 사용됩니다." />
                            <PrivacySection title="제2조 (개인정보의 수집 항목)" content="회사는 서비스 제공을 위해 카카오로부터 고유 식별값, 닉네임, 프로필 사진을 제공받으며, 사용자가 직접 입력하는 직원 이름, 근무 일시, 급여 설정액 등을 수집합니다." />
                            <PrivacySection title="제3조 (개인정보의 보유 및 이용기간)" content="사용자가 탈퇴하거나 데이터 삭제를 요청할 때까지 원칙적으로 보관됩니다. 다만, 상법 및 전자상거래법 등 관련 법령에 의해 보관이 필요한 경우 해당 기간 동안 별도 관리됩니다." />
                            <PrivacySection title="제4조 (정보주체의 권리 및 의무)" content="사용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 서비스 탈퇴를 통해 개인정보 이용 동의를 철회할 수 있습니다. 수집된 데이터는 사용자의 명시적 요청 없이 제3자에게 제공되지 않습니다." />
                            <PrivacySection title="제5조 (개인정보 보호를 위한 기술적 대책)" content="회사는 사용자의 데이터를 보호하기 위해 외부 침입 차단 시스템을 운영하며, 모든 통신은 최신 암호화 기술(HTTPS/SSL)을 사용하여 가로채기나 변조를 방지합니다." />
                        </div>

                        <div className="pt-10 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-400 font-black">
                            최종 업데이트: 2026년 4월 30일 (v8.0)<br />
                            책임자: 급여박사 운영팀 (support@payroll.app)
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'help' && (
                <div className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-gray-950 flex flex-col animate-in slide-in-from-right-full duration-300 max-w-lg mx-auto left-0 right-0 border-x border-gray-100 dark:border-gray-800">
                    <div className="flex items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                            <span className="text-[15px] font-bold">닫기</span>
                        </button>
                        <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900 dark:text-gray-100">자주 묻는 질문</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-5">
                        <FaqItem question="주휴수당은 어떻게 계산되나요?" answer="일주일 소정근로시간이 15시간 이상이고, 모든 근무일에 개근한 경우 1일분의 임금을 추가로 지급하는 수당입니다. 급여박사는 해당 주의 총 근무시간을 계산하여 1/5에 해당하는 시간을 주휴 시간으로 자동 합산합니다." />
                        <FaqItem question="4대보험 공제 기준이 궁금해요." answer="2026년 최신 요율인 국민연금(4.75%), 건강보험(3.595%), 고용보험(0.9%)을 적용합니다. 장기요양보험료는 건강보험료의 13.134%가 적용됩니다. 이는 근로자 부담분 기준이며 사장님 부담분은 별도입니다." />
                        <FaqItem question="밤 늦게 일하면 시급이 더 비싼가요?" answer="네, 밤 10시부터 다음 날 아침 6시 사이의 근로는 '야간근로'에 해당하여 통상임금의 50%를 가산하여 지급해야 합니다. 급여박사는 이 시간대를 자동으로 판별하여 가산 수당을 별도 표시해 드립니다." />
                        <FaqItem question="휴게시간(점심시간)은 어떻게 빼나요?" answer="근무 기록을 입력할 때 하단의 '휴게시간' 입력란에 분 단위로 입력하세요. 예를 들어 60분을 입력하면, 총 근무시간에서 1시간이 자동으로 차감되어 급여가 계산됩니다." />
                        <FaqItem question="직원에게 급여 명세서를 보내고 싶어요." answer="정산 탭에서 각 직원의 상세 내역을 확인한 후, 하단의 [이미지로 저장] 또는 [카카오톡 공유] 버튼을 누르세요. 깔끔하게 정리된 급여 명세서 이미지가 생성되어 직원에게 바로 전송할 수 있습니다." />
                        <FaqItem question="로그인을 꼭 해야 하나요?" answer="로그인을 하지 않아도 사용은 가능하지만, 데이터가 사용자의 휴대폰에만 저장됩니다. 휴대폰을 분실하거나 앱을 삭제하면 복구가 불가능하므로, 반드시 카카오 계정 연동을 권장합니다." />
                        <FaqItem question="퇴직금 계산도 지원하나요?" answer="현재 버전에서는 월별 급여 정산을 주력으로 지원하고 있습니다. 퇴직금(1년 이상 근무 시 발생) 계산 기능은 향후 대규모 업데이트를 통해 추가될 예정입니다." />
                        <FaqItem question="세금 3.3% 공제는 어떻게 하나요?" answer="프리랜서 또는 사업소득자로 등록하는 경우, 4대보험 대신 총액의 3.3%를 소득세로 공제하도록 [직원 설정]에서 선택하실 수 있습니다." />
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
        >
            <div className="flex items-center gap-3.5 text-gray-800 dark:text-gray-200">
                <div className="text-gray-500 dark:text-gray-400">
                    {icon}
                </div>
                <span className="font-semibold text-[15px]">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        </button>
    );
}

function GuideAccordionItem({ number, title, content, image }: { number: string, title: string, content: React.ReactNode, image: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-2 pr-4">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-black shrink-0 text-[13px]">{number}</div>
                    <span className="font-bold text-[13.5px] sm:text-[15px] text-gray-900 dark:text-gray-100">{title}</span>
                </div>
                <ChevronRight className={clsx("w-4 h-4 text-gray-300 transition-transform duration-200", isOpen && "rotate-90")} />
            </button>
            {isOpen && (
                <div className="px-5 pb-6 pt-0 animate-in fade-in slide-in-from-top-1 space-y-5">
                    <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mb-2" />
                    <div className="flex justify-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-3xl">
                        <img src={image} alt={title} className="w-[85%] h-auto object-contain rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700" />
                    </div>
                    <div className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed font-bold">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}

function PrivacySection({ title, content }: { title: string, content: string }) {
    return (
        <div className="space-y-2">
            <h4 className="font-black text-gray-900 dark:text-gray-100 text-[14px]">{title}</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-bold">{content}</p>
        </div>
    );
}

function GuideStep({ number, title, content }: { number: string, title: string, content: string }) {
    return (
        <div className="flex gap-5">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black shrink-0 text-sm">{number}</div>
            <div className="space-y-1.5">
                <h4 className="font-bold text-gray-900 dark:text-gray-100">{title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{content}</p>
            </div>
        </div>
    );
}

function FaqItem({ question, answer }: { question: string, answer: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                <span className="font-bold text-[14px] text-gray-900 dark:text-gray-100 pr-4">{question}</span>
                <ChevronRight className={clsx("w-4 h-4 text-gray-300 transition-transform duration-200", isOpen && "rotate-90")} />
            </button>
            {isOpen && (
                <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-1">
                    <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{answer}</p>
                </div>
            )}
        </div>
    );
}

