import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SolapiMessageService } from 'solapi';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 상위 디렉토리의 .env 파일을 로드합니다.
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Solapi 메시지 서비스 초기화 (API Key, API Secret)
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

// 카카오 토큰 교환 및 사용자 정보 가져오기 API
app.post('/api/kakao/callback', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    const REST_API_KEY = process.env.VITE_KAKAO_REST_API_KEY;
    console.log('Backend using REST_API_KEY:', REST_API_KEY);
    console.log('Backend using REDIRECT_URI:', redirect_uri);
    const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET; // 필요 시 사용

    // 1. 인가 코드로 토큰 발급 요청
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: REST_API_KEY,
      redirect_uri: redirect_uri,
      code: code,
    });
    if (CLIENT_SECRET) tokenParams.append('client_secret', CLIENT_SECRET);

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: tokenParams,
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('카카오 토큰 에러:', tokenData);
      return res.status(400).json({ success: false, message: tokenData.error_description || '토큰 발급 실패' });
    }

    // 2. 발급받은 액세스 토큰으로 사용자 정보 가져오기
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
    });
    const userData = await userResponse.json();

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('카카오 로그인 연동 실패:', error);
    res.status(500).json({ success: false, message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 카카오 알림톡 발송 API 라우트
app.post('/api/send-alimtalk', async (req, res) => {
  try {
    const { phoneNumber, staffName, month, totalHours, netPay } = req.body;

    if (!phoneNumber || !staffName || !month || !totalHours || !netPay) {
      return res.status(400).json({ success: false, message: '필수 데이터가 누락되었습니다.' });
    }

    const message = {
      to: phoneNumber.replace(/[^0-9]/g, ''), // 숫자만 추출
      from: process.env.SOLAPI_SENDER_NUMBER || '', // 발신자 번호 (등록된 번호)
      kakaoOptions: {
        pfId: process.env.SOLAPI_PFID || '', // 카카오 비즈니스 채널 PFID
        templateId: process.env.SOLAPI_TEMPLATE_ID || '', // 승인된 알림톡 템플릿 ID
        // 템플릿에 등록된 변수값 매핑 (템플릿 내용에 맞게 수정 필요)
        variables: {
          '#{이름}': staffName,
          '#{월}': month,
          '#{근무시간}': totalHours.toString(),
          '#{실지급액}': netPay.toLocaleString()
        }
      }
    };

    // Solapi 알림톡 발송 요청
    const response = await messageService.sendOne(message);
    
    console.log('알림톡 발송 성공:', response);
    res.json({ success: true, message: '알림톡이 성공적으로 발송되었습니다.', data: response });
  } catch (error) {
    console.error('알림톡 발송 실패:', error);
    res.status(500).json({ success: false, message: '알림톡 발송에 실패했습니다.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
