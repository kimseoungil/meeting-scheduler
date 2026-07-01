'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveDraft, loadDraft, DraftParticipant } from '@/lib/group-draft';
import { FRIEND_SEEDS } from '@/lib/friend-seeds';
import { supabase } from '@/lib/supabase';

const HOST_NAME = '김성일'; // 프로토타입: 본인 고정. 실제 서비스라면 로그인 사용자.

export default function ParticipantsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DraftParticipant[]>([{ name: HOST_NAME, role: 'host' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft.title === undefined) {
      // 1단계를 안 거치고 들어온 경우 되돌림
      router.replace('/group/new/info');
      return;
    }
    if (draft.participants && draft.participants.length > 0) {
      setSelected(draft.participants);
    }
  }, []);

  const candidates = FRIEND_SEEDS.filter(
    (f) =>
      f.name !== HOST_NAME &&
      f.name.includes(query) &&
      !selected.some((s) => s.name === f.name)
  );

  function addParticipant(name: string) {
    setSelected((prev) => [...prev, { name, role: 'required' }]);
    setQuery('');
  }

  function removeParticipant(name: string) {
    setSelected((prev) => prev.filter((p) => p.name !== name));
  }

  function toggleRole(name: string) {
    setSelected((prev) =>
      prev.map((p) =>
        p.name === name && p.role !== 'host'
          ? { ...p, role: p.role === 'required' ? 'optional' : 'required' }
          : p
      )
    );
  }

  const canProceed = selected.length >= 2; // 본인 포함 최소 2명

  async function handleCreate() {
    if (!canProceed || saving) return;
    setSaving(true);

    const draft = loadDraft();
    saveDraft({ participants: selected });

    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          title: draft.title,
          start_date: draft.startDate,
          end_date: draft.endDate,
          deadline: draft.deadline,
          grid_start_hour: draft.gridStartHour ?? 9,
          grid_end_hour: draft.gridEndHour ?? 20,
        })
        .select()
        .single();

      if (groupError || !group) throw groupError;

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .insert(
          selected.map((p) => ({
            group_id: group.id,
            name: p.name,
            role: p.role,
          }))
        )
        .select();

      if (participantsError || !participantsData) throw participantsError;

      const host = participantsData.find((p) => p.role === 'host');
      if (host) {
        router.push(`/group/${group.id}/schedule?pid=${host.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('그룹 생성 중 문제가 발생했어요. 다시 시도해주세요.');
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>2 / 5</p>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>참석자를 선택해주세요</h1>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름으로 검색"
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 8,
          border: '1px solid #ddd',
          fontSize: 15,
          boxSizing: 'border-box',
          marginBottom: 8,
        }}
      />

      {query && candidates.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
          {candidates.map((c) => (
            <button
              key={c.name}
              onClick={() => addParticipant(c.name)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: '#fff',
                border: 'none',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 14,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {query && candidates.length === 0 && (
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 16px' }}>검색 결과가 없어요.</p>
      )}

      <p style={{ fontSize: 13, color: '#666', margin: '8px 0 8px' }}>참석자 ({selected.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {selected.map((p) => (
          <div
            key={p.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: '#f7f7f5',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>{p.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.role === 'host' ? (
                <span style={{ fontSize: 12, color: '#999' }}>주최자</span>
              ) : (
                <button
                  onClick={() => toggleRole(p.name)}
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    background: p.role === 'required' ? '#111' : '#fff',
                    color: p.role === 'required' ? '#fff' : '#666',
                  }}
                >
                  {p.role === 'required' ? '필참' : '선택'}
                </button>
              )}
              {p.role !== 'host' && (
                <button
                  onClick={() => removeParticipant(p.name)}
                  style={{ fontSize: 13, color: '#bbb', border: 'none', background: 'none', padding: '4px' }}
                  aria-label={`${p.name} 삭제`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleCreate}
        disabled={!canProceed || saving}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          background: canProceed && !saving ? '#111' : '#e5e5e5',
          color: canProceed && !saving ? '#fff' : '#999',
          fontSize: 16,
          fontWeight: 500,
          border: 'none',
          marginTop: 16,
        }}
      >
        {saving ? '만드는 중...' : '회의 만들고 내 일정 입력하기'}
      </button>
    </main>
  );
}
