// 그룹 생성 흐름(회의 정보 -> 참석자 선택) 동안 sessionStorage에 임시 저장
import { Role } from './supabase';

export interface DraftParticipant {
  name: string;
  role: Role;
}

export interface GroupDraft {
  title: string;
  startDate: string;
  endDate: string;
  deadline: string;
  gridStartHour: number;
  gridEndHour: number;
  participants: DraftParticipant[];
}

const KEY = 'group_draft';

export function saveDraft(draft: Partial<GroupDraft>) {
  const current = loadDraft();
  const merged = { ...current, ...draft };
  sessionStorage.setItem(KEY, JSON.stringify(merged));
}

export function loadDraft(): Partial<GroupDraft> {
  if (typeof window === 'undefined') return {};
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function clearDraft() {
  sessionStorage.removeItem(KEY);
}
