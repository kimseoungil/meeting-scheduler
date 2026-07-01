'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveDraft, loadDraft } from '@/lib/group-draft';
import { format, addDays } from 'date-fns';

export default function GroupInfoPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');

  useEffect(() => {
    const draft = loadDraft();
    if (draft.title) setTitle(draft.title);
    if (draft.startDate) setStartDate(draft.startDate);
    if (draft.endDate) setEndDate(draft.endDate);

    // 기본값: 오늘 기준 다음 평일 ~ 다음 주 금요일
    if (!draft.startDate || !draft.endDate) {
      const today = new Date();
      const start = addDays(today, 1);
      const end = addDays(today, 7);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
    if (!draft.deadline) {
      setDeadlineDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, []);

  const canProceed = title.trim().length > 0 && startDate && endDate && deadlineDate && deadlineTime;

  function handleNext() {
    saveDraft({
      title: title.trim(),
      startDate,
      endDate,
      deadline: `${deadlineDate}T${deadlineTime}:00`,
      gridStartHour: 9,
      gridEndHour: 20,
    });
    router.push('/group/new/participants');
  }

  return (
    <main style={{ minHeight: '100dvh', padding: '20px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 4px' }}>1 / 5</p>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>회의 정보를 입력해주세요</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        <Field label="회의 제목">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 휴가 숙소 정하기"
            style={inputStyle}
          />
        </Field>

        <Field label="기간">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <span style={{ color: '#999' }}>–</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>

        <Field label="응답 마감">
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={{ ...inputStyle, flex: 1.4 }} />
            <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
      </div>

      <button
        onClick={handleNext}
        disabled={!canProceed}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          background: canProceed ? '#111' : '#e5e5e5',
          color: canProceed ? '#fff' : '#999',
          fontSize: 16,
          fontWeight: 500,
          border: 'none',
          marginTop: 24,
        }}
      >
        다음: 참석자 선택
      </button>
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
