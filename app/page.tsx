'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>모두의 시간</h1>
        <p style={{ fontSize: 15, color: '#666', margin: 0, lineHeight: 1.6 }}>
          여러 명이 함께 회의 시간을 정할 때, 캘린더와 선호도를 모아 가장 좋은 시간을 자동으로 찾아드려요.
        </p>
      </div>
      <button
        onClick={() => router.push('/group/new/info')}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          background: '#111',
          color: '#fff',
          fontSize: 16,
          fontWeight: 500,
          border: 'none',
        }}
      >
        회의 만들기
      </button>
    </main>
  );
}
