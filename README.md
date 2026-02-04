# 급여 관리자 (Payroll MVP)

사장님을 위한 간편 급여/근태 관리 웹앱입니다.

## 🚀 시작하기

이 프로젝트는 Vite + React + TypeScript로 작성되었습니다.

### 1. 설치 및 실행

터미널에서 다음 명령어를 순서대로 실행하세요.

```bash
cd payroll-app
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속하면 바로 사용할 수 있습니다.

### 2. 주요 기능 및 사용법

1. **설정**: 우측 하단 [설정] 탭에서 야간 근로 시간대와 시급 계산 규칙을 확인하세요.
2. **직원 등록**: [직원] 탭에서 직원을 추가하고 시급과 주휴수당 적용 여부를 설정하세요.
3. **근태 기록**: [근태] 탭에서 출근/퇴근 시간을 입력합니다. 야간 시간(22:00~)이 포함되면 자동으로 야간수당 대상이 됩니다.
4. **급여 정산**: [정산] 탭에서 이번 달 급여를 계산합니다. "계산하기" 버튼을 누르면 모든 수당이 자동 합산됩니다.

### 3. Firebase 배포 (선택사항)

실제 서버에 배포하려면 Firebase 호스팅을 이용하세요.

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 📁 파일 구조

- `src/lib/payroll.ts`: 급여 계산 핵심 로직 (야간/연장/주휴)
- `src/lib/storage.ts`: 데이터 저장소 (현재는 브라우저 LocalStorage 사용)
- `src/pages/*`: 주요 화면 (홈, 직원, 근태, 정산, 설정)

---
*Created by Antigravity*
