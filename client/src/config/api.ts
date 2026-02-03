/**
 * API 엔드포인트 설정
 * 환경 변수로 관리하여 GitHub 노출 방지
 */

// Google Sheets API URL (가계부)
export const GOOGLE_SHEET_URL =
  import.meta.env.VITE_GOOGLE_SHEET_URL ||
  'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// MongoDB API Base URL (Todo, Bible)
export const MONGODB_API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
