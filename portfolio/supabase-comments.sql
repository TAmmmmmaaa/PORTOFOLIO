-- Tempel seluruh isi file ini di Supabase > SQL Editor, lalu klik Run.
-- Aman dijalankan berulang kali, termasuk kalau tabel `comments` sudah ada dari versi sebelumnya.

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Kolom IP pengirim, diisi otomatis oleh trigger di bawah. Dipakai untuk membatasi spam,
-- dan tidak bisa dibaca maupun diisi oleh pengunjung.
alter table public.comments add column if not exists client_ip text;

create index if not exists comments_ip_created_idx on public.comments (client_ip, created_at desc);
create index if not exists comments_created_idx on public.comments (created_at desc);

-- ---------------------------------------------------------------------------
-- Keamanan akses: pengunjung (anon) hanya boleh MEMBACA dan MENAMBAH komentar,
-- dan hanya kolom yang perlu. Tidak ada izin mengubah atau menghapus.
-- Hapus komentar yang tidak diinginkan lewat dashboard Supabase.
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "siapa saja boleh baca komentar" on public.comments;
create policy "siapa saja boleh baca komentar"
  on public.comments for select to anon using (true);

drop policy if exists "siapa saja boleh kirim komentar" on public.comments;
create policy "siapa saja boleh kirim komentar"
  on public.comments for insert to anon with check (true);

revoke all on public.comments from anon;
grant select (id, name, message, created_at) on public.comments to anon;
grant insert (name, message) on public.comments to anon;

-- ---------------------------------------------------------------------------
-- Anti-spam di sisi server (tidak bisa dilewati dengan mengosongkan localStorage):
--   * maksimal 1 komentar per 30 detik dari satu IP
--   * maksimal 10 komentar per jam dari satu IP
--   * pesan yang sama persis tidak boleh dikirim ulang dalam 10 menit
--   * maksimal 2 tautan (http://, https://, www.) dalam satu pesan
--   * batas keseluruhan 20 komentar per menit, sebagai pengaman kalau IP dipalsukan
-- Penolakan memunculkan pesan `rate_limit` atau `too_many_links`, yang diterjemahkan
-- menjadi kalimat ramah oleh src/lib/comments.js.
-- Angka-angka di atas bisa diubah langsung di fungsi di bawah ini.
-- ---------------------------------------------------------------------------
create or replace function public.comments_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json;
  ip text;
  link_count int;
begin
  -- Ambil IP asli pengunjung dari header yang diteruskan Supabase.
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
    ip := nullif(
      btrim(coalesce(hdrs ->> 'cf-connecting-ip', split_part(coalesce(hdrs ->> 'x-forwarded-for', ''), ',', 1))),
      ''
    );
  exception when others then
    ip := null;
  end;

  new.client_ip := ip;
  new.name := btrim(new.name);
  new.message := btrim(new.message);

  select count(*) into link_count
  from regexp_matches(new.message, '(https?://|www\.)', 'gi');
  if link_count > 2 then
    raise exception 'too_many_links';
  end if;

  if ip is not null then
    if exists (
      select 1 from public.comments
      where client_ip = ip and created_at > now() - interval '30 seconds'
    ) then
      raise exception 'rate_limit';
    end if;

    if (
      select count(*) from public.comments
      where client_ip = ip and created_at > now() - interval '1 hour'
    ) >= 10 then
      raise exception 'rate_limit';
    end if;

    if exists (
      select 1 from public.comments
      where client_ip = ip and message = new.message and created_at > now() - interval '10 minutes'
    ) then
      raise exception 'rate_limit';
    end if;
  end if;

  if (
    select count(*) from public.comments
    where created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'rate_limit';
  end if;

  return new;
end;
$$;

revoke all on function public.comments_guard() from public;

drop trigger if exists comments_guard_trg on public.comments;
create trigger comments_guard_trg
  before insert on public.comments
  for each row execute function public.comments_guard();
