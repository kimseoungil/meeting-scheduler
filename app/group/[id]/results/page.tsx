'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, Group, Participant, TimeBlock } from '@/lib/supabase';
import { calculateRecommendations, SlotCandidate } from '@/lib/recommend';
import { getWeekdayLabel, formatDateShort, slotToTimeLabel } from '@/lib/date-utils';

const ROLE_LABEL: Record<string, string> = {
  host: '주최자',
  required: '필참',
  optional: '선택 참여',
};

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const myParticipantId = searchParams.get('pid');

  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'loading' | 'done' | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: groupData }, { data: participantsData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase.from('participants').select('*').eq('group_id', groupId).order('created_at'),
    ]);

    setGroup(groupData);
    setParticipants(participantsData || []);

    if (participantsData && participantsData.length > 0) {
      const ids = participantsData.map((p) => p.id);
      const { data: blocksData } = await supabase.from('time_blocks').select('*').in('participant_id', ids);
      setTimeBlocks(blocksData || []);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `group_id=eq.${groupId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_blocks' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchData]);

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

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/group/${groupId}/join` : '';

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const completedCount = participants.filter((p) => p.status === 'completed').length;
  const allResponded = participants.length > 0 && completedCount === participants.length;

  function handleConfirm() {
    setConfirmModal('loading');
    setTimeout(() => setConfirmModal('done'), 2000);
  }
  const deadlineLabel = new Date(group.deadline).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main style={{ minHeight: '100dvh', padding: '24px 40px', maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 260,
          }}>
            {confirmModal === 'loading' ? (
              <>
                <div style={{
                  width: 48, height: 48, border: '3px solid #eee',
                  borderTop: '3px solid #111', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>캘린더에 추가하는 중...</p>
              </>
            ) : (
              <>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: '#111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>캘린더에 추가했습니다!</p>
                <button
                  onClick={() => setConfirmModal(null)}
                  style={{
                    marginTop: 4, padding: '10px 28px', borderRadius: 10,
                    background: '#f7f7f5', border: 'none', fontSize: 14, color: '#666',
                  }}
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>5 / 5</p>
        <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>{group.title}</h1>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* 왼쪽: 추천 카드 */}
        <div style={{ flex: 3, minWidth: 0, maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>추천 회의 시간</p>
            <p style={{ fontSize: 11, color: '#999', margin: 0 }}>마감 {deadlineLabel}</p>
          </div>

          {candidates.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f7f7f5', borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: '#999', margin: 0 }}>
                아직 모두가 가능한 시간을 찾지 못했어요. 참여자들이 입력을 마치면 다시 계산돼요.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {candidates.map((c, i) => (
                <CandidateCard
                  key={`${c.date}_${c.startSlot}`}
                  candidate={c}
                  rank={i + 1}
                  gridStartHour={group.grid_start_hour}
                  canConfirm={i === 0 && allResponded}
                  onConfirm={handleConfirm}
                />
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 참여자 + 버튼 */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>
            참여자 {completedCount}/{participants.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
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
                  <span style={{ fontSize: 11, color: '#1d9e75' }}>완료</span>
                ) : (
                  <span style={{ fontSize: 11, color: '#ba7517' }}>대기</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {myParticipantId && participants.find((p) => p.id === myParticipantId)?.role === 'host' && (
          <button
            onClick={() => router.push(`/group/${groupId}/edit?pid=${myParticipantId}`)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              background: '#111',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
            }}
          >
            회의 수정
          </button>
        )}
        {myParticipantId && (
          <button
            onClick={() => router.push(`/group/${groupId}/schedule?pid=${myParticipantId}`)}
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
            cursor: 'pointer',
          }}
        >
          {copied ? '링크가 복사됐어요' : '초대 링크 복사'}
        </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function CandidateCard({ candidate, rank, gridStartHour, canConfirm, onConfirm }: {
  candidate: SlotCandidate;
  rank: number;
  gridStartHour: number;
  canConfirm?: boolean;
  onConfirm?: () => void;
}) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
            {getWeekdayLabel(candidate.date)} {formatDateShort(candidate.date)} · {startTime}–{endTime}
          </p>
          <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>
            필참 {candidate.requiredAvailable}/{candidate.requiredTotal} 가능
            {candidate.optionalTotal > 0 && ` · 선택 ${candidate.optionalAvailable}/${candidate.optionalTotal} 가능`}
            {candidate.dislikedCount > 0 && ` · 비선호 ${candidate.dislikedCount}명 포함`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
          {isTop ? (
            <span style={{ fontSize: 11, background: '#e6f1fb', color: '#0c447c', padding: '3px 10px', borderRadius: 6 }}>1순위</span>
          ) : (
            <span style={{ fontSize: 11, color: '#999' }}>{rank}순위</span>
          )}
          {isTop && (
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: canConfirm ? '#111' : '#e5e5e5',
                color: canConfirm ? '#fff' : '#aaa',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {canConfirm ? '확정하기' : '응답 대기 중'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
