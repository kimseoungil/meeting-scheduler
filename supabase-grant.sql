-- anon, authenticated 역할에 테이블 기본 권한 부여
-- (RLS 정책은 "행 단위" 필터링이고, 이 GRANT는 "테이블 단위" 접근 허용임 - 둘 다 필요)

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.groups to anon, authenticated;
grant select, insert, update, delete on public.participants to anon, authenticated;
grant select, insert, update, delete on public.time_blocks to anon, authenticated;
