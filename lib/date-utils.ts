import { eachDayOfInterval, format, parseISO, getDay } from 'date-fns';

// 평일만 추출 (월~금)
export function getWeekdays(startDate: string, endDate: string): string[] {
  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });
  return days
    .filter((d) => {
      const day = getDay(d);
      return day !== 0 && day !== 6; // 일요일, 토요일 제외
    })
    .map((d) => format(d, 'yyyy-MM-dd'));
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function getWeekdayLabel(dateStr: string): string {
  const day = getDay(parseISO(dateStr));
  return WEEKDAY_LABELS[day];
}

export function formatDateShort(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, 'M/d');
}

// 슬롯 인덱스 -> "HH:mm" 라벨 (slot_index 0 = gridStartHour:00, 1 = gridStartHour:30 ...)
export function slotToTimeLabel(slotIndex: number, gridStartHour: number): string {
  const totalMinutes = gridStartHour * 60 + slotIndex * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minuteStr = minute > 0 ? `:${String(minute).padStart(2, '0')}` : '';
  return `${period}${displayHour}시${minuteStr}`;
}

export function getSlotCount(gridStartHour: number, gridEndHour: number): number {
  return (gridEndHour - gridStartHour) * 2;
}

// 1시간 회의 후보 슬롯 시작 인덱스 목록 (마지막 슬롯에서 1시간이 들어가야 하므로 -2)
export function getMeetingStartSlots(gridStartHour: number, gridEndHour: number): number[] {
  const totalSlots = getSlotCount(gridStartHour, gridEndHour);
  const slots: number[] = [];
  for (let i = 0; i <= totalSlots - 2; i++) {
    slots.push(i);
  }
  return slots;
}
