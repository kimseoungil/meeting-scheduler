'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Group, Participant } from '@/lib/supabase';

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      const { data: participantsData } = await supabase.from('participants').select('*').eq('group_id', groupId).order('created_at');
      setGroup(groupData);
      setParticipants(participantsData || []);
      setLoading(false);
    })();
  }, [groupId]);

  if (loading || !group) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: 14 }}>불러오는 중...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>회의 초대</p>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{group.title}</h1>
      </div>

      <p style={{ fontSize: 14, color: '#666', margin: '0 0 12px' }}>본인 이름을 선택해주세요</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/group/${groupId}/schedule?pid=${p.id}`)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: 10,
              background: '#f7f7f5',
              border: 'none',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{p.name}</span>
            {p.status === 'completed' && <span style={{ fontSize: 11, color: '#1d9e75' }}>응답 완료</span>}
          </button>
        ))}
      </div>
    </main>
  );
}
