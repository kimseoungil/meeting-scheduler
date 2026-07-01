'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, Group, Participant } from '@/lib/supabase';
import ScheduleGrid, { slotKey } from '@/components/ScheduleGrid';

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const participantId = searchParams.get('pid');

  const [group, setGroup] = useState<Group | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [step, setStep] = useState<'unavailable' | 'disliked'>('unavailable');
  const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(new Set());
  const [dislikedSlots, setDislikedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    (async () => {
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      const { data: participantData } = await supabase.from('participants').select('*').eq('id', participantId).single();
      setGroup(groupData);
      setParticipant(participantData);
      setLoading(false);
    })();
  }, [groupId, participantId]);

  if (loading || !group || !participant) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: 14 }}>불러오는 중...</p>
      </main>
    );
  }

  async function handleNext() {
    if (step === 'unavailable') {
      setStep('disliked');
      return;
    }

    // 최종 저장
    setSaving(true);
    try {
      // 기존 입력 삭제 후 재삽입 (재방문/수정 대응)
      await supabase.from('time_blocks').delete().eq('participant_id', participant!.id);

      const rows: { participant_id: string; date: string; slot_index: number; type: 'unavailable' | 'disliked' }[] = [];
      unavailableSlots.forEach((key) => {
        const [date, slot] = key.split('_');
        rows.push({ participant_id: participant!.id, date, slot_index: parseInt(slot, 10), type: 'unavailable' });
      });
      dislikedSlots.forEach((key) => {
        const [date, slot] = key.split('_');
        rows.push({ participant_id: participant!.id, date, slot_index: parseInt(slot, 10), type: 'disliked' });
      });

      if (rows.length > 0) {
        await supabase.from('time_blocks').insert(rows);
      }

      await supabase.from('participants').update({ status: 'completed' }).eq('id', participant!.id);

      router.push(`/group/${groupId}/results?pid=${participant!.id}`);
    } catch (err) {
      console.error(err);
      alert('저장 중 문제가 발생했어요.');
      setSaving(false);
    }
  }

  const stepNumber = step === 'unavailable' ? 3 : 4;

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>{stepNumber} / 5</p>
        {step === 'unavailable' ? (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>안 되는 시간을 확인해주세요</h1>
            <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }}>
              아래는 비워둔 상태예요. 회의가 불가능한 시간을 드래그해서 칠해주세요.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>선호하지 않는 시간이 있나요?</h1>
            <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }}>
              가능은 하지만 피하고 싶은 시간대를 칠해주세요. 진한 회색은 이미 불가로 표시한 시간이에요.
            </p>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowX: 'auto' }}>
        {step === 'unavailable' ? (
          <ScheduleGrid
            startDate={group.start_date}
            endDate={group.end_date}
            gridStartHour={group.grid_start_hour}
            gridEndHour={group.grid_end_hour}
            fixedSlots={new Set()}
            activeSlots={unavailableSlots}
            onChange={setUnavailableSlots}
            activeColor="#e2554a"
            fixedColor="#ddd"
            fixedLabel="캘린더 일정"
            activeLabel="직접 표시한 불가 시간"
          />
        ) : (
          <ScheduleGrid
            startDate={group.start_date}
            endDate={group.end_date}
            gridStartHour={group.grid_start_hour}
            gridEndHour={group.grid_end_hour}
            fixedSlots={unavailableSlots}
            activeSlots={dislikedSlots}
            onChange={setDislikedSlots}
            activeColor="#eba62f"
            fixedColor="#ccc"
            fixedLabel="불가 (수정 불가)"
            activeLabel="비선호 시간"
          />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={saving}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          background: '#111',
          color: '#fff',
          fontSize: 16,
          fontWeight: 500,
          border: 'none',
          marginTop: 16,
        }}
      >
        {saving ? '저장하는 중...' : step === 'unavailable' ? '다음' : '완료'}
      </button>
    </main>
  );
}
