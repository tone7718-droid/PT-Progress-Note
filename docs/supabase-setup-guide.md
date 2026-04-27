# Supabase 셋업 가이드 (물리치료 Progress Note)

## 1. Supabase 계정 및 프로젝트 생성

1. https://supabase.com 에 접속하여 **Start your project** 클릭
2. GitHub 계정으로 가입 (또는 이메일)
3. **New project** 클릭
4. 설정:
   - **Organization**: 기본 org 선택
   - **Name**: `pt-progress-note`
   - **Database Password**: 강력한 비밀번호 설정 (메모해두세요)
   - **Region**: `Northeast Asia (Tokyo)` 또는 `Southeast Asia (Singapore)` 선택
5. **Create new project** 클릭 후 약 2분 대기

## 2. API 키 확인

프로젝트 생성 후:

1. 좌측 메뉴 **Settings** > **API** 이동
2. 아래 두 값을 복사:
   - **Project URL**: `https://xxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (긴 JWT 토큰)

이 값들을 `.env.local` 파일에 입력합니다.

## 3. Auth 설정

1. 좌측 메뉴 **Authentication** > **Providers** 이동
2. **Email** 프로바이더 확인 (기본 활성화)
3. **Authentication** > **Settings** 이동:
   - **Enable email confirmations**: **OFF** (내부 사용이므로 이메일 인증 불필요)
   - **Enable new user signups**: **OFF** (치료사는 master가 등록)

## 4. 데이터베이스 스키마 생성

1. 좌측 메뉴 **SQL Editor** 이동
2. **New query** 클릭
3. `supabase-schema.sql` 파일의 내용을 전체 복사하여 붙여넣기
4. **Run** 클릭
5. 성공 메시지 확인

## 5. Edge Function 배포 (치료사 생성용)

Supabase CLI 설치가 필요합니다:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-therapist
```

또는 Supabase Dashboard > **Edge Functions**에서 직접 생성할 수 있습니다.

## 6. 마스터 계정 초기 생성

SQL Editor에서 다음 스크립트를 실행하여 초기 마스터 계정을 생성합니다.
(Edge Function 배포 후 앱에서도 생성 가능)

```sql
-- 마스터 Auth 사용자 생성은 Edge Function 또는 Dashboard > Authentication > Users에서 수행
-- Email: master@pt-clinic.internal
-- Password: 원하는 비밀번호
```

Dashboard > **Authentication** > **Users** > **Add user** 에서:
- Email: `master@pt-clinic.internal`
- Password: 원하는 비밀번호
- Auto Confirm User: 체크

그 후 SQL Editor에서:
```sql
INSERT INTO therapists (uid, auth_user_id, login_id, name, role, resigned)
VALUES (
  'master-uid',
  (SELECT id FROM auth.users WHERE email = 'master@pt-clinic.internal'),
  'master',
  '관리자 (Master)',
  'master',
  false
);
```

## 7. 환경 변수 설정

프로젝트 루트의 `.env.local` 파일에 값을 입력:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

이후 `npm run dev`로 앱을 실행하면 Supabase에 연결됩니다.
