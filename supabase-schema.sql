-- 회의 그룹
create table groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  end_date date not null,
  deadline timestamptz not null,
  grid_start_hour int not null default 9,
  grid_end_hour int not null default 20,
  created_at timestamptz not null default now()
);

-- 참여자
create table participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  role text not null check (role in ('host', 'required', 'optional')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

-- 시간 블록 입력 (30분 단위 슬롯, type: unavailable(불가) / disliked(비선호))
create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  date date not null,
  slot_index int not null, -- 0 = grid_start_hour:00, 1 = grid_start_hour:30 ...
  type text not null check (type in ('unavailable', 'disliked')),
  created_at timestamptz not null default now(),
  unique (participant_id, date, slot_index)
);

-- RLS 활성화
alter table groups enable row level security;
alter table participants enable row level security;
alter table time_blocks enable row level security;

-- 프로토타입 단계: 링크를 아는 사람은 누구나 읽고 쓸 수 있도록 허용
-- (실서비스 전환 시 auth 기반 정책으로 교체 필요)
create policy "anyone can read groups" on groups for select using (true);
create policy "anyone can insert groups" on groups for insert with check (true);

create policy "anyone can read participants" on participants for select using (true);
create policy "anyone can insert participants" on participants for insert with check (true);
create policy "anyone can update participants" on participants for update using (true);

create policy "anyone can read time_blocks" on time_blocks for select using (true);
create policy "anyone can insert time_blocks" on time_blocks for insert with check (true);
create policy "anyone can delete time_blocks" on time_blocks for delete using (true);
