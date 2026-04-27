# Windows 코드 서명 가이드

## 왜 필요한가

서명되지 않은 `.msi`/`.exe` 를 실행하면 Windows가 **SmartScreen** 경고를 띄운다:
> "Windows protected your PC — PT Progress Note (알 수 없는 게시자)"

사용자가 "추가 정보 → 실행" 을 눌러야 설치가 진행된다. 대부분의 사용자는 이 단계에서 포기한다.

서명하면:
- 게시자(= 본인/법인 이름)가 표시됨
- SmartScreen 평판이 쌓이면 경고 자체가 사라짐
- 자동 업데이트 설치 시 UAC 다이얼로그에 "확인된 게시자"로 표시

---

## 옵션 비교

| 옵션 | 가격 | 즉시 신뢰 | 비고 |
|---|---|---|---|
| **Azure Trusted Signing** | ~$10/월 | △ (평판 축적 필요) | **권장** — 신규/1인 개발자 친화적. HSM 불필요. |
| **EV Code Signing Certificate** | $200~400/년 | ✅ (즉시) | Sectigo, DigiCert 등. USB 토큰 배송받음. |
| **OV (Standard) Code Signing** | $70~200/년 | △ | EV보다 저렴하지만 평판 축적 필요. |
| **자체 서명 (self-signed)** | 무료 | ❌ | 기업 내 도메인 배포용. 일반 배포 부적합. |

> 개인/클리닉 내부 배포면 **Azure Trusted Signing** 이 가장 합리적.
> 전국 단위 배포할 거면 **EV Certificate** 로 SmartScreen 경고를 즉시 제거.

---

## Option A: Azure Trusted Signing 설정

### ① Azure 준비
1. Azure 계정 생성 (https://portal.azure.com)
2. "Trusted Signing Accounts" 리소스 생성 (리전: East US 등)
3. Identity Validation 제출:
   - 개인 → 정부 발행 ID (주민등록증/여권) 업로드
   - 법인 → 사업자 등록증 + D-U-N-S 번호
   - 승인까지 2~7일

### ② Certificate Profile 생성
- Azure Portal → Trusted Signing Account → "Certificate profiles" → Create
- Profile name: `pt-progress-note-profile`
- Subject name: 본인/법인 이름 (Validation과 일치해야 함)

### ③ 서비스 주체(Service Principal) 생성
```powershell
az login
az ad sp create-for-rbac --name "tauri-signing-sp" `
  --role "Trusted Signing Certificate Profile Signer" `
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/<RG>/providers/Microsoft.CodeSigning/codeSigningAccounts/<ACCOUNT>"
```
출력된 `appId`, `password`, `tenant` 보관.

### ④ `tauri.conf.json` 에 signCommand 추가
```json
{
  "bundle": {
    "windows": {
      "signCommand": "trusted-signing-cli sign --endpoint https://eus.codesigning.azure.net --account <ACCOUNT> --certificate-profile pt-progress-note-profile %1"
    }
  }
}
```

### ⑤ `trusted-signing-cli` 설치
```bash
cargo install trusted-signing-cli
```

### ⑥ 환경변수 설정 후 빌드
```powershell
$env:AZURE_TENANT_ID     = "<tenant>"
$env:AZURE_CLIENT_ID     = "<appId>"
$env:AZURE_CLIENT_SECRET = "<password>"
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw ".tauri-keys\pt-updater.key"
npm run tauri:build
```
→ MSI/EXE 파일에 Azure 서명이 자동 적용됨.

---

## Option B: EV Code Signing Certificate 설정

### ① 인증서 구매 & 수령
- Sectigo / SSL.com / DigiCert 에서 구매
- 신원 확인 (전화, 화상 인터뷰) 후 **USB 토큰** 배송 (3~5일)

### ② SignTool 설치
Windows SDK 포함 — https://developer.microsoft.com/windows/downloads/windows-sdk/

### ③ `tauri.conf.json` 에 서명 설정 추가
```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign /fd SHA256 /tr http://timestamp.sectigo.com /td SHA256 /a %1"
    }
  }
}
```
`/a` 플래그는 "컴퓨터에 설치된 인증서 중 자동 선택" 옵션. USB 토큰이 꽂혀 있으면 해당 인증서 사용.

### ④ 빌드
```powershell
npm run tauri:build
```
도중에 토큰 비밀번호 프롬프트 → 입력하면 자동 서명.

> USB 토큰 방식이라 GitHub Actions로 자동 빌드가 까다로움. 매 릴리즈마다 로컬 수동 빌드 필요.
> Azure Trusted Signing 은 HSM/토큰 없이 CI에서 자동 서명 가능 — 이게 최대 장점.

---

## Option C: 자체 서명 (테스트/내부 배포만)

```powershell
# 자체 서명 인증서 생성 (1회)
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=PT Progress Note Dev" `
  -CertStoreLocation "Cert:\CurrentUser\My"

# .pfx로 내보내기
$pwd = ConvertTo-SecureString -String "yourpassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "dev-cert.pfx" -Password $pwd
```

`tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign /f dev-cert.pfx /p yourpassword /fd SHA256 %1"
    }
  }
}
```

→ 테스트 PC에서 해당 인증서를 "신뢰할 수 있는 루트 인증 기관"에 수동 등록해야 경고 없이 실행됨. **일반 사용자 배포에는 쓰지 말 것.**

---

## 검증 방법

설치 파일 우클릭 → 속성 → "디지털 서명" 탭에 서명 정보가 뜨면 성공.
또는 PowerShell:
```powershell
Get-AuthenticodeSignature "PT Progress Note_0.2.0_x64_en-US.msi"
```
`Status: Valid` 가 나오면 통과.

---

## 권장 로드맵

1. **지금 (v0.1.x)**: 자체 서명 or 서명 없이 배포. 본인/가족/동료만 테스트.
2. **베타 (v0.2~0.5)**: Azure Trusted Signing 설정 후 유효 서명으로 배포. SmartScreen 평판 축적.
3. **정식 출시 (v1.0+)**: 전국 배포 계획이라면 EV Certificate 추가 구매해 SmartScreen 경고 즉시 제거.
