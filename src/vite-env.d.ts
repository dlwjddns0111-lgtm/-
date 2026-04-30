/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_REST_API_KEY: string
  readonly VITE_KAKAO_REDIRECT_URI: string
  // 더 많은 환경 변수들을 여기에 추가할 수 있습니다.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Kakao: any;
}
