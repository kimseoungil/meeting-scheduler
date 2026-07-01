import { Participant, TimeBlock } from './supabase';
import { getWeekdays, getMeetingStartSlots, getSlotCount } from './date-utils';

export interface SlotCandidate {
  date: string;
  startSlot: number; // 1시간 회의의 시작 슬롯 인덱스
  requiredAvailable: number;
  requiredTotal: number;
  optionalAvailable: number;
  optionalTotal: number;
  dislikedCount: number; // 비선호로 표시한 사람 수 (가능한 사람 중)
  isViable: boolean; // 필수 참석자 전원 가능 여부
}

export function calculateRecommendations(
  participants: Participant[],
  timeBlocks: TimeBlock[],
  startDate: string,
  endDate: string,
  gridStartHour: number,
  gridEndHour: number
): SlotCandidate[] {
  const weekdays = getWeekdays(startDate, endDate);
  const meetingStartSlots = getMeetingStartSlots(gridStartHour, gridEndHour);
  const totalSlots = getSlotCount(gridStartHour, gridEndHour);

  // 응답 완료한 사람만 계산에 포함 (미응답자는 가용 여부 불명이므로 제외)
  const completedParticipants = participants.filter((p) => p.status === 'completed');
  const requiredParticipants = completedParticipants.filter((p) => p.role === 'host' || p.role === 'required');
  const optionalParticipants = completedParticipants.filter((p) => p.role === 'optional');

  // participant_id + date + slot_index -> type 매핑
  const blockMap = new Map<string, 'unavailable' | 'disliked'>();
  for (const block of timeBlocks) {
    blockMap.set(`${block.participant_id}_${block.date}_${block.slot_index}`, block.type);
  }

  function getBlockType(participantId: string, date: string, slotIndex: number) {
    return blockMap.get(`${participantId}_${date}_${slotIndex}`);
  }

  // 1시간 회의 = 연속된 2개의 30분 슬롯
  function isParticipantUnavailable(participantId: string, date: string, startSlot: number): boolean {
    for (let i = 0; i < 2; i++) {
      const slot = startSlot + i;
      if (slot >= totalSlots) return true;
      if (getBlockType(participantId, date, slot) === 'unavailable') return true;
    }
    return false;
  }

  function isParticipantDisliked(participantId: string, date: string, startSlot: number): boolean {
    for (let i = 0; i < 2; i++) {
      const slot = startSlot + i;
      if (getBlockType(participantId, date, slot) === 'disliked') return true;
    }
    return false;
  }

  const candidates: SlotCandidate[] = [];

  for (const date of weekdays) {
    for (const startSlot of meetingStartSlots) {
      let requiredAvailable = 0;
      let dislikedCount = 0;

      for (const p of requiredParticipants) {
        if (!isParticipantUnavailable(p.id, date, startSlot)) {
          requiredAvailable++;
          if (isParticipantDisliked(p.id, date, startSlot)) dislikedCount++;
        }
      }

      let optionalAvailable = 0;
      for (const p of optionalParticipants) {
        if (!isParticipantUnavailable(p.id, date, startSlot)) {
          optionalAvailable++;
          if (isParticipantDisliked(p.id, date, startSlot)) dislikedCount++;
        }
      }

      candidates.push({
        date,
        startSlot,
        requiredAvailable,
        requiredTotal: requiredParticipants.length,
        optionalAvailable,
        optionalTotal: optionalParticipants.length,
        dislikedCount,
        isViable: requiredAvailable === requiredParticipants.length,
      });
    }
  }

  // 정렬: 1) 필수 전원 가능 여부 2) 선택 참석자 가능 인원 많은 순 3) 비선호 적은 순 4) 이른 시간 순
  const sorted = candidates
    .filter((c) => c.isViable)
    .sort((a, b) => {
      if (b.optionalAvailable !== a.optionalAvailable) return b.optionalAvailable - a.optionalAvailable;
      if (a.dislikedCount !== b.dislikedCount) return a.dislikedCount - b.dislikedCount;
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startSlot - b.startSlot;
    });

  return sorted.slice(0, 5);
}
