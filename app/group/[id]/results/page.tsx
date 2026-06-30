'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, Group, Participant, TimeBlock } from '@/lib/supabase';
import { calculateRecommendations, SlotCandidate } from '@/lib/recommend';
import { getWeekdayLabel, formatDateShort, slotToTimeLabel } from '@/lib/date-utils';

const ROLE_LABEL: Record<string, string> = {
  host: '주최자',
  required: '필참',
  optional: '선택 참여',
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const myParticipantId = searchParams.get('pid');

  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: groupData }, { data: participantsData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', params.id).single(),
      supabase.from('participants').select('*').eq('group_id', params.id).order('created_at'),
    ]);

    setGroup(groupData);
    setParticipants(participantsData || []);

    if (participantsData && participantsData.length > 0) {
      const ids = participantsData.map((p) => p.id);
      const { data: blocksData } = await supabase.from('time_blocks').select('*').in('participant_id', ids);
      setTimeBlocks(blocksData || []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`group-${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${params.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_blocks' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, fetchData]);

  if (loading || !group) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: 14 }}>불러오는 중...</p>
      </main>
    );
  }

  const candidates = calculateRecommendations(
    participants,
    timeBlocks,
    group.start_date,
    group.end_date,
    group.grid_start_hour,
    group.grid_end_hour
  );

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/group/${params.id}/join` : '';

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const completedCount = participants.filter((p) => p.status === 'completed').length;
  const deadlineLabel = new Date(group.deadline).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>5 / 5</p>
        <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>{group.title}</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>추천 회의 시간</p>
        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>마감 {deadlineLabel}</p>
      </div>

      {candidates.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f7f7f5', borderRadius: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
            아직 모두가 가능한 시간을 찾지 못했어요. 참여자들이 입력을 마치면 다시 계산돼요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {candidates.map((c, i) => (
            <CandidateCard key={`${c.date}_${c.startSlot}`} candidate={c} rank={i + 1} gridStartHour={group.grid_start_hour} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>
        참여자 {completedCount}/{participants.length}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {participants.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: p.id === myParticipantId ? '#eef6ff' : '#f7f7f5',
              borderRadius: 8,
            }}
          >
            <div>
              <span style={{ fontSize: 13 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>{ROLE_LABEL[p.role]}</span>
            </div>
            {p.status === 'completed' ? (
              <span style={{ fontSize: 11, color: '#1d9e75' }}>응답 완료</span>
            ) : (
              <span style={{ fontSize: 11, color: '#ba7517' }}>응답 대기</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {myParticipantId && (
          <button
            onClick={() => router.push(`/group/${params.id}/schedule?pid=${myParticipantId}`)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              background: '#fff',
              color: '#111',
              fontSize: 14,
              fontWeight: 500,
              border: '1px solid #ddd',
            }}
          >
            내 입력 수정
          </button>
        )}
        <button
          onClick={copyInviteLink}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            background: '#f7f7f5',
            color: '#666',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
          }}
        >
          {copied ? '링크가 복사됐어요' : '참여자 초대 링크 복사'}
        </button>
      </div>
    </main>
  );
}

function CandidateCard({ candidate, rank, gridStartHour }: { candidate: SlotCandidate; rank: number; gridStartHour: number }) {
  const isTop = rank === 1;
  const startTime = slotToTimeLabel(candidate.startSlot, gridStartHour);
  const endTime = slotToTimeLabel(candidate.startSlot + 2, gridStartHour);

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        background: '#fff',
        border: isTop ? '2px solid #185fa5' : '1px solid #eee',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
          {getWeekdayLabel(candidate.date)} {formatDateShort(candidate.date)} · {startTime}–{endTime}
        </p>
        {isTop ? (
          <span style={{ fontSize: 11, background: '#e6f1fb', color: '#0c447c', padding: '3px 10px', borderRadius: 6 }}>1순위</span>
        ) : (
          <span style={{ fontSize: 11, color: '#999' }}>{rank}순위</span>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>
        필참 {candidate.requiredAvailable}/{candidate.requiredTotal} 가능
        {candidate.optionalTotal > 0 && ` · 선택 ${candidate.optionalAvailable}/${candidate.optionalTotal} 가능`}
        {candidate.dislikedCount > 0 && ` · 비선호 ${candidate.dislikedCount}명 포함`}
      </p>
    </div>
  );
}
