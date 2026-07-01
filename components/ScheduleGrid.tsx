'use client';

import { useState, useRef, useCallback } from 'react';
import { getWeekdays, getWeekdayLabel, formatDateShort, slotToTimeLabel, getSlotCount } from '@/lib/date-utils';

export interface SlotKey {
  date: string;
  slot: number;
}

interface ScheduleGridProps {
  startDate: string;
  endDate: string;
  gridStartHour: number;
  gridEndHour: number;
  // 이미 확정된(수정 불가) 슬롯 - 예: 불가 단계에서는 캘린더 자동 반영분, 비선호 단계에서는 불가로 픽스된 슬롯
  fixedSlots: Set<string>; // key: `${date}_${slot}`
  // 현재 사용자가 칠하고 있는 슬롯
  activeSlots: Set<string>;
  onChange: (slots: Set<string>) => void;
  activeColor: string; // 사용자가 칠하는 색
  fixedColor: string; // 고정된(수정 불가) 슬롯 색
  fixedLabel: string;
  activeLabel: string;
}

export function slotKey(date: string, slot: number): string {
  return `${date}_${slot}`;
}

export default function ScheduleGrid({
  startDate,
  endDate,
  gridStartHour,
  gridEndHour,
  fixedSlots,
  activeSlots,
  onChange,
  activeColor,
  fixedColor,
  fixedLabel,
  activeLabel,
}: ScheduleGridProps) {
  const weekdays = getWeekdays(startDate, endDate);
  const totalSlots = getSlotCount(gridStartHour, gridEndHour);
  const slotIndices = Array.from({ length: totalSlots }, (_, i) => i);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (date: string, slot: number) => {
      const key = slotKey(date, slot);
      if (fixedSlots.has(key)) return; // 고정된 슬롯은 수정 불가
      const willAdd = !activeSlots.has(key);
      setDragMode(willAdd ? 'add' : 'remove');
      setIsDragging(true);
      const next = new Set(activeSlots);
      if (willAdd) next.add(key);
      else next.delete(key);
      onChange(next);
    },
    [activeSlots, fixedSlots, onChange]
  );

  const handlePointerEnter = useCallback(
    (date: string, slot: number) => {
      if (!isDragging) return;
      const key = slotKey(date, slot);
      if (fixedSlots.has(key)) return;
      const next = new Set(activeSlots);
      if (dragMode === 'add') next.add(key);
      else next.delete(key);
      onChange(next);
    },
    [isDragging, dragMode, activeSlots, fixedSlots, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 4칸(2시간)마다 시간 라벨 표시
  const labelEvery = 4;

  return (
    <div
      ref={containerRef}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
      style={{ userSelect: 'none', touchAction: 'none' }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 11, color: '#888' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: fixedColor, display: 'inline-block' }} />
          {fixedLabel}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: activeColor, display: 'inline-block' }} />
          {activeLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `32px repeat(${weekdays.length}, 1fr)`, columnGap: 2, rowGap: 0 }}>
        <div />
        {weekdays.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#999', paddingBottom: 4 }}>
            <div>{getWeekdayLabel(d)}</div>
            <div style={{ fontSize: 10, color: '#bbb' }}>{formatDateShort(d)}</div>
          </div>
        ))}

        {slotIndices.map((slot) => (
          <FragmentRow
            key={slot}
            slot={slot}
            weekdays={weekdays}
            showLabel={slot % labelEvery === 0}
            gridStartHour={gridStartHour}
            fixedSlots={fixedSlots}
            activeSlots={activeSlots}
            fixedColor={fixedColor}
            activeColor={activeColor}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  slot,
  weekdays,
  showLabel,
  gridStartHour,
  fixedSlots,
  activeSlots,
  fixedColor,
  activeColor,
  onPointerDown,
  onPointerEnter,
}: {
  slot: number;
  weekdays: string[];
  showLabel: boolean;
  gridStartHour: number;
  fixedSlots: Set<string>;
  activeSlots: Set<string>;
  fixedColor: string;
  activeColor: string;
  onPointerDown: (date: string, slot: number) => void;
  onPointerEnter: (date: string, slot: number) => void;
}) {
  return (
    <>
      <div style={{ fontSize: 9, color: '#bbb', textAlign: 'right', paddingRight: 4, lineHeight: '14px' }}>
        {showLabel ? slotToTimeLabel(slot, gridStartHour) : ''}
      </div>
      {weekdays.map((date) => {
        const key = slotKey(date, slot);
        const isFixed = fixedSlots.has(key);
        const isActive = activeSlots.has(key);
        const isColored = isFixed || isActive;
        const bg = isFixed ? fixedColor : isActive ? activeColor : '#fff';
        return (
          <div
            key={key}
            onMouseDown={() => onPointerDown(date, slot)}
            onMouseEnter={() => onPointerEnter(date, slot)}
            onTouchStart={(e) => {
              e.preventDefault();
              onPointerDown(date, slot);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              const el = document.elementFromPoint(touch.clientX, touch.clientY);
              const cellKey = el?.getAttribute('data-cellkey');
              if (cellKey) {
                const [d, s] = cellKey.split('_');
                onPointerEnter(d, parseInt(s, 10));
              }
            }}
            data-cellkey={key}
            style={{
              height: 14,
              background: bg,
              borderBottom: isColored ? 'none' : '1px solid #f0f0f0',
              cursor: isFixed ? 'default' : 'pointer',
            }}
          />
        );
      })}
    </>
  );
}
