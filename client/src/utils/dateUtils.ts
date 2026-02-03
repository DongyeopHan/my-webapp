/**
 * 날짜 관련 유틸리티 함수 모음
 */

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getToday = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 변환
 */
export const formatDateForInput = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 현재 월을 YYYY-MM 형식으로 반환
 */
export const getCurrentMonth = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * 시트명(YY.MM)을 월 형식(YYYY-MM)으로 변환
 */
export const convertSheetNameToMonth = (sheetName: string): string => {
  const [yy, mm] = sheetName.split('.');
  const year = parseInt(yy) + 2000;
  return `${year}-${mm}`;
};

/**
 * 월(YYYY-MM)을 표시용 형식(YYYY년 M월)으로 변환
 */
export const formatMonthDisplay = (month: string): string => {
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m)}월`;
};

/**
 * 날짜(YYYY-MM-DD)를 표시용 형식(M월 D일)으로 변환
 */
export const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
};

/**
 * 배열을 날짜 기준으로 정렬 (내림차순)
 */
export const sortByDateDesc = <T extends { date: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
};
