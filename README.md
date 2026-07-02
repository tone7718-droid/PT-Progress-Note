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
- **비밀번호 강도**: 치료사 비밀번호는 숫자 4~8자리로 제한되어 있어(PBKDF2 200k
  iterations 적용에도) 로컬 데이터 접근이 가능한 공격자는 브루트포스가 가능합니다.
  로그인은 "동료 간 실수 방지" 용도이지 강력한 접근 통제가 아닙니다.
- **기본 마스터 계정**: 첫 실행 시 `master` / `0000` 이 자동 생성됩니다.
  설치 후 반드시 비밀번호를 변경하세요.
- **내보내기 파일**: 데이터 내보내기(JSON)는 환자 기록 평문과 치료사 비밀번호
  해시를 포함합니다 (기기 이전 시 계정까지 복원하기 위함). 내보낸 파일은
  암호화된 저장소 밖에 있으므로 안전한 위치에 보관해야 합니다.

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
