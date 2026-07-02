'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, Group, Participant } from '@/lib/supabase';
import { FRIEND_SEEDS } from '@/lib/friend-seeds';
import { format, addDays, parseISO } from 'date-fns';

function addWorkingDays(dateStr: string, days: number): string {
  let d = parseISO(dateStr);
  let added = 0;
  while (added < days) {
    d = addDays(d, 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return format(d, 'yyyy-MM-dd');
}

const HOST_NAME = '김성일';

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const myParticipantId = searchParams.get('pid');

  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 편집 상태
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [{ data: groupData }, { data: participantsData }] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('participants').select('*').eq('group_id', groupId).order('created_at'),
      ]);

      if (!groupData || !participantsData) return;

      // host 권한 확인
      const me = participantsData.find((p) => p.id === myParticipantId);
      if (!me || me.role !== 'host') {
        router.replace(`/group/${groupId}/results?pid=${myParticipantId}`);
        return;
      }

      setGroup(groupData);
      setParticipants(participantsData);
      setTitle(groupData.title);
      setStartDate(groupData.start_date);
      setEndDate(groupData.end_date);

      const dl = new Date(groupData.deadline);
      const pad = (n: number) => String(n).padStart(2, '0');
      setDeadlineDate(`${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())}`);
      setDeadlineTime(`${pad(dl.getHours())}:${pad(dl.getMinutes())}`);

      setLoading(false);
    }
    fetchData();
  }, [groupId, myParticipantId, router]);

  const candidates = FRIEND_SEEDS.filter(
    (f) =>
      f.name !== HOST_NAME &&
      f.name.includes(query) &&
      !participants.some((p) => p.name === f.name)
  );

  async function addParticipant(name: string) {
    setQuery('');
    const { data, error } = await supabase
      .from('participants')
      .insert({ group_id: groupId, name, role: 'required' })
      .select()
      .single();
    if (!error && data) {
      setParticipants((prev) => [...prev, data]);
    }
  }

  async function removeParticipant(p: Participant) {
    // time_blocks 먼저 삭제 후 participant 삭제
    await supabase.from('time_blocks').delete().eq('participant_id', p.id);
    await supabase.from('participants').delete().eq('id', p.id);
    setParticipants((prev) => prev.filter((x) => x.id !== p.id));
  }

  async function toggleRole(p: Participant) {
    const newRole = p.role === 'required' ? 'optional' : 'required';
    await supabase.from('participants').update({ role: newRole }).eq('id', p.id);
    setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, role: newRole } : x)));
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value) {
      setEndDate(addWorkingDays(value, 4));
      setDeadlineDate(format(addDays(parseISO(value), -2), 'yyyy-MM-dd'));
    }
  }

  async function handleSave() {
    if (!group || saving) return;
    setSaving(true);
    await supabase
      .from('groups')
      .update({
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        deadline: `${deadlineDate}T${deadlineTime}:00`,
      })
      .eq('id', groupId);
    setSaving(false);
    router.push(`/group/${groupId}/results?pid=${myParticipantId}`);
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: 14 }}>불러오는 중...</p>
      </main>
    );
  }

  const canSave = title.trim().length > 0 && startDate && endDate && deadlineDate && deadlineTime;

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>회의 수정</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="회의 제목">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="기간">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()} style={{ ...inputStyle, flex: 1 }} />
            <span style={{ color: '#999' }}>–</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>

        <Field label="응답 마감">
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()} style={{ ...inputStyle, flex: 1.4 }} />
            <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>

        <Field label="참석자">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && candidates.length > 0) addParticipant(candidates[0].name); }}
            placeholder="이름으로 검색해서 추가"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          {query && candidates.length > 0 && (
            <div style={{ border: '1px solid #eee', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
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
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {query && candidates.length === 0 && (
            <p style={{ fontSize: 13, color: '#999', margin: '0 0 12px' }}>검색 결과가 없어요.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {participants.map((p) => (
              <div
                key={p.id}
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
                      onClick={() => toggleRole(p)}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        background: p.role === 'required' ? '#111' : '#fff',
                        color: p.role === 'required' ? '#fff' : '#666',
                        cursor: 'pointer',
                      }}
                    >
                      {p.role === 'required' ? '필참' : '선택'}
                    </button>
                  )}
                  {p.role !== 'host' && (
                    <button
                      onClick={() => removeParticipant(p)}
                      style={{ fontSize: 13, color: '#bbb', border: 'none', background: 'none', padding: '4px', cursor: 'pointer' }}
                      aria-label={`${p.name} 삭제`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button
          onClick={() => router.push(`/group/${groupId}/results?pid=${myParticipantId}`)}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: 12,
            background: '#f7f7f5',
            color: '#666',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            flex: 2,
            padding: '16px',
            borderRadius: 12,
            background: canSave && !saving ? '#111' : '#e5e5e5',
            color: canSave && !saving ? '#fff' : '#999',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: canSave && !saving ? 'pointer' : 'default',
          }}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 6px' }}>{label}</p>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 15,
  boxSizing: 'border-box',
};
