import { useState, useEffect } from 'react';

type Language = '한국어' | '영어' | '일본어';

export function useLanguage() {
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('language') as Language) || '한국어';
    });

    const setLanguage = (newLang: Language) => {
        localStorage.setItem('language', newLang);
        setLanguageState(newLang);
        // Force reload to apply across the app immediately (simplest global state)
        window.location.reload();
    };

    return { language, setLanguage };
}

export const getTranslations = (lang: Language) => {
    return {
        // App.tsx
        navHome: lang === '한국어' ? '홈' : lang === '영어' ? 'Home' : 'ホーム',
        navStaff: lang === '한국어' ? '직원' : lang === '영어' ? 'Staff' : 'スタッフ',
        navAttendance: lang === '한국어' ? '근태' : lang === '영어' ? 'Attendance' : '勤怠',
        navPayroll: lang === '한국어' ? '정산' : lang === '영어' ? 'Payroll' : '精算',
        navSettings: lang === '한국어' ? '설정' : lang === '영어' ? 'Settings' : '設定',

        // Settings.tsx
        profileCard: lang === '한국어' ? '일반 사용자' : lang === '영어' ? 'Normal User' : '一般ユーザー',
        screenMode: lang === '한국어' ? '화면 모드' : lang === '영어' ? 'Display Mode' : '画面モード',
        screenModeDesc: lang === '한국어' ? '눈이 편한 모드를 선택하세요' : lang === '영어' ? 'Choose a comfortable mode' : '快適なモードを選択してください',
        light: lang === '한국어' ? '라이트' : lang === '영어' ? 'Light' : 'ライト',
        dark: lang === '한국어' ? '다크' : lang === '영어' ? 'Dark' : 'ダーク',
        system: lang === '한국어' ? '시스템' : lang === '영어' ? 'System' : 'システム',
        account: lang === '한국어' ? '계정' : lang === '영어' ? 'Account' : 'アカウント',
        profileSettings: lang === '한국어' ? '프로필 설정' : lang === '영어' ? 'Profile Settings' : 'プロフィール設定',
        notifications: lang === '한국어' ? '알림' : lang === '영어' ? 'Notifications' : '通知',
        langMenu: lang === '한국어' ? '언어 (Language)' : lang === '영어' ? 'Language' : '言語 (Language)',
        support: lang === '한국어' ? '지원' : lang === '영어' ? 'Support' : 'サポート',
        guide: lang === '한국어' ? '앱 사용 안내 다시 보기' : lang === '영어' ? 'View App Guide Again' : 'アプリの利用案内をもう一度見る',
        privacy: lang === '한국어' ? '개인정보 처리방침' : lang === '영어' ? 'Privacy Policy' : 'プライバシーポリシー',
        help: lang === '한국어' ? '도움말' : lang === '영어' ? 'Help' : 'ヘルプ',
        logout: lang === '한국어' ? '로그아웃' : lang === '영어' ? 'Logout' : 'ログアウト',
        
        // Settings Modals
        save: lang === '한국어' ? '저장' : lang === '영어' ? 'Save' : '保存',
        name: lang === '한국어' ? '이름' : lang === '영어' ? 'Name' : '名前',
        statusMsg: lang === '한국어' ? '상태 메시지' : lang === '영어' ? 'Status Message' : 'ステータスメッセージ',
        statusPlaceholder: lang === '한국어' ? '상태 메시지를 입력하세요' : lang === '영어' ? 'Enter a status message' : 'ステータスメッセージを入力してください',
        notiSettings: lang === '한국어' ? '알림 설정' : lang === '영어' ? 'Notification Settings' : '通知設定',
        pushNoti: lang === '한국어' ? '푸시 알림' : lang === '영어' ? 'Push Notifications' : 'プッシュ通知',
        pushDesc: lang === '한국어' ? '앱의 주요 알림을 받습니다' : lang === '영어' ? 'Receive important app notifications' : 'アプリの重要な通知を受け取ります',
        notiSound: lang === '한국어' ? '알림음 선택' : lang === '영어' ? 'Notification Sound' : '通知音を選択',
        soundDefault: lang === '한국어' ? '기본음' : lang === '영어' ? 'Default' : 'デフォルト',
        soundChime: lang === '한국어' ? '차임벨' : lang === '영어' ? 'Chime' : 'チャイム',
        soundBeep: lang === '한국어' ? '삐빅' : lang === '영어' ? 'Beep' : 'ビープ音',

        // Home
        homeStorePrompt: lang === '한국어' ? '가게 이름을 입력하세요' : lang === '영어' ? 'Enter store name' : '店舗名を入力してください',
        homeEstCost: lang === '한국어' ? '이번 달 예상 인건비' : lang === '영어' ? 'Est. Labor Cost This Month' : '今月の予想人件費',
        homeCurrency: lang === '한국어' ? '원' : lang === '영어' ? 'KRW' : 'ウォン',
        homeMonthlyTrend: lang === '한국어' ? '월별 추이' : lang === '영어' ? 'Monthly Trend' : '月別推移',
        homeLast4Months: lang === '한국어' ? '최근 4개월' : lang === '영어' ? 'Last 4 Months' : '過去4ヶ月',

        // Generic
        loading: lang === '한국어' ? '로딩 중...' : lang === '영어' ? 'Loading...' : 'ロード中...',
    };
};
