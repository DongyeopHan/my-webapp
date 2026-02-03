/**
 * 시간 관련 유틸리티 함수
 */

/**
 * "오전/오후 HH시 MM분" 형식의 문자열을 분 단위로 변환
 * @param timeString - 시간 문자열 (예: "오전 9시 30분", "오후 2시 15분")
 * @returns 자정부터의 경과 분 수
 */
export const parseTimeToMinutes = (timeString: string): number => {
  const match = timeString.match(/(오전|오후)\s*(\d+)시\s*(\d+)분/);
  if (!match) return 0;

  const period = match[1];
  const hour = parseInt(match[2]);
  const minute = parseInt(match[3]);

  let totalMinutes = hour * 60 + minute;
  if (period === '오후' && hour !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === '오전' && hour === 12) {
    totalMinutes = minute; // 오전 12시는 0시
  }

  return totalMinutes;
};

/**
 * time 속성을 가진 배열을 시간순으로 정렬
 * @param items - 정렬할 배열
 * @returns 시간순으로 정렬된 새 배열
 */
export const sortByTimeAsc = <T extends { time: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });
};

/**
 * 시간 문자열 파싱 (시간, 분 추출)
 * @param timeString - 시간 문자열 (예: "오전 9시 30분")
 * @returns 시간 정보 객체 { period, hour, minute }
 */
export const parseTimeString = (
  timeString: string,
): { period: string; hour: string; minute: string } => {
  const match = timeString.match(/(오전|오후)\s*(\d+)시\s*(\d+)분/);
  return {
    period: match?.[1] || '오전',
    hour: match?.[2] || '9',
    minute: match?.[3] || '00',
  };
};

/**
 * 시간 정보를 문자열로 포맷
 * @param period - 오전/오후
 * @param hour - 시
 * @param minute - 분
 * @returns 포맷된 시간 문자열 (예: "오전 9시 30분")
 */
export const formatTimeString = (
  period: string,
  hour: string,
  minute: string,
): string => {
  return `${period} ${hour}시 ${minute}분`;
};
