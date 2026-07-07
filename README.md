# PT-NOTE

> **Proprietary software for physical therapy progress notes.**
> **All rights reserved. No reuse permitted without explicit written permission.**
> See [LICENSE](./LICENSE) for full terms.

물리치료(도수치료) 환자의 평가 및 치료 내용을 기록하기 위한 데스크톱·웹 애플리케이션.

## Tech Stack

- **Frontend**: Next.js 16 (Turbopack, static export), React 19, TypeScript, Tailwind CSS
- **State**: Zustand
- **Backend (cloud mode)**: Supabase (Auth, Postgres, RLS, Edge Functions)
- **Storage (local mode)**: Browser localStorage via `lib/localDataService.ts`
- **Desktop**: Tauri v2 (Windows MSI/NSIS, macOS, Linux)
- **Mobile**: Capacitor v8 (Android, iOS)
- **Web hosting**: Vercel

## Distribution

- **Web**: https://ptnote.vercel.app
- **Windows desktop**: Download from [GitHub Releases](https://github.com/tone7718-droid/PT-Progress-Note/releases/latest)

The desktop app includes a built-in auto-updater that checks
[`releases/latest/download/latest.json`](https://github.com/tone7718-droid/PT-Progress-Note/releases/latest/download/latest.json)
and prompts the user when a new signed release is available.

## Security Model & Known Limitations (로컬 모드)

로컬 모드는 "기기 1대에서 단독 사용"을 전제로 한 위협 모델입니다. 알려진 한계:

- **암호화 키 위치**: 환자 노트·자동 백업·임시 저장은 AES-GCM 으로 암호화되지만,
  암호화 키(`pt_enc_key_v1`)가 같은 localStorage 에 저장됩니다. 즉 이 암호화는
  "디스크 파일이 평문으로 노출되는 것"을 막는 수준이며, 기기(브라우저 프로필)에
  접근 가능한 공격자로부터는 보호하지 못합니다.
- **비밀번호 정책**: 치료사 비밀번호는 등록·변경 공통으로 4~20자
  영문/숫자/특수문자입니다 (PBKDF2 200k iterations, salt 적용).
  다만 로컬 데이터에 접근 가능한 공격자의 오프라인 브루트포스까지 막지는
  못하므로, 로그인은 "동료 간 실수 방지" 용도이지 강력한 접근 통제가 아닙니다.
- **기본 마스터 계정**: 첫 실행 시 `master` / `0000` 이 자동 생성됩니다.
  설치 후 반드시 비밀번호를 변경하세요.
- **내보내기 파일**: 데이터 내보내기(JSON, v3)는 환자 기록을 **평문**으로
  포함하지만 치료사 비밀번호 해시는 포함하지 않습니다. 내보내기 실행 시
  본인 비밀번호 재확인이 필요하며, 백업에서 복원된 치료사 계정은 비밀번호
  미설정(로그인 잠금) 상태이므로 master 가 치료사 관리 > 재설정으로
  활성화해야 합니다 (v2 이하 구버전 백업의 해시는 하위 호환을 위해 그대로
  복원됩니다). 내보낸 파일은 암호화되지 않으므로 안전한 위치에 보관하세요.
- **Android 자동백업 차단**: 모바일 앱은 `allowBackup=false` 및 백업 제외
  규칙으로 Google 클라우드 백업·기기 이전 대상에서 앱 데이터를 제외합니다.
  기기 이전은 앱 내 "데이터 내보내기/가져오기"를 사용하세요.

## Documentation

- [Tauri release procedure](./docs/tauri-release-guide.md)
- [Code signing guide](./docs/code-signing-guide.md)
- [Supabase setup](./docs/supabase-setup-guide.md)
- [Database schema](./docs/supabase-schema.sql)

## License

This project is **proprietary**. The source code is publicly viewable for
transparency, automatic-update manifest hosting, and personal portfolio
purposes only — public viewability does not grant any license to reuse,
modify, or redistribute. See [LICENSE](./LICENSE) for full terms.

For commercial licensing or partnership inquiries, contact: **tone7718@gmail.com**
