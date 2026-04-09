# ScriptFlow -- 프로젝트 스펙

> AI가 코드를 짤 때 지켜야 할 규칙과 절대 하면 안 되는 것.
> 이 문서를 AI에게 항상 함께 공유하세요.

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | 현재 코드 기반. SSR + API Routes 통합. |
| DB/백엔드 | Supabase (PostgreSQL) | 인증-DB 통합, RLS로 워크스페이스 격리, 실시간 기능 내장 |
| ORM | Supabase Client (supabase-js) | Supabase와 네이티브 통합. 필요시 Prisma 추가 가능 |
| 배포 | Vercel | Next.js 최적 배포 플랫폼. GitHub 연동 자동 배포 |
| 인증 | 접근 코드 (자체 구현) | 로그인 없이 팀 접근. 간단하고 마찰 최소화 |
| 스타일링 | Tailwind CSS 4 | 현재 코드 기반. 유틸리티 클래스 기반 빠른 개발 |
| AI | Claude API (@anthropic-ai/sdk) | 요약/변환 품질 우수. 현재 코드에서 이미 사용 중 |
| PDF | html2pdf.js | 클라이언트 사이드 PDF 생성. 서버 부담 없음 |

---

## 프로젝트 구조

```
video-script-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transcript/    # 자막 추출 API
│   │   │   ├── summarize/     # AI 요약 API
│   │   │   ├── convert/       # 스크립트 변환 API
│   │   │   ├── workspace/     # 워크스페이스 CRUD
│   │   │   ├── project/       # 프로젝트 CRUD
│   │   │   ├── analysis/      # 분석 결과 저장/조회
│   │   │   ├── comment/       # 댓글 CRUD
│   │   │   └── template/      # 템플릿 CRUD
│   │   ├── workspace/
│   │   │   ├── [code]/        # 워크스페이스 메인 (접근 코드로 라우팅)
│   │   │   │   ├── project/[id]/  # 프로젝트 상세
│   │   │   │   └── analysis/[id]/ # 분석 결과 상세
│   │   │   └── new/           # 워크스페이스 생성
│   │   ├── result/            # 분석 결과 (기존)
│   │   ├── layout.tsx
│   │   ├── page.tsx           # 랜딩 페이지
│   │   └── globals.css
│   ├── components/            # 재사용 UI 컴포넌트
│   ├── lib/
│   │   ├── supabase.ts        # Supabase 클라이언트 설정
│   │   └── utils.ts           # 유틸리티 함수
│   └── types/
│       └── index.ts           # TypeScript 타입 정의
├── PRD/                       # 기획 문서
├── public/
├── .env.local                 # 환경변수
└── package.json
```

---

## 절대 하지 마 (DO NOT)

> AI에게 코드를 시킬 때 이 목록을 반드시 함께 공유하세요.

- [ ] API 키나 비밀번호를 코드에 직접 쓰지 마 (.env.local 사용)
- [ ] 기존 DB 스키마를 임의로 변경하지 마 (마이그레이션으로 관리)
- [ ] 현재 동작하는 기능(자막 추출, AI 요약, 변환, PDF)을 깨뜨리지 마
- [ ] 목업/하드코딩 데이터로 "완성"이라고 하지 마 (실제 Supabase 연동 필수)
- [ ] package.json의 기존 의존성 버전을 변경하지 마
- [ ] Supabase RLS 정책 없이 테이블을 public으로 열지 마
- [ ] 접근 코드를 평문으로 DB에 저장하지 마 (해시 처리)
- [ ] `console.log`로 민감 데이터(API 키, 접근 코드)를 출력하지 마
- [ ] `dangerouslySetInnerHTML`에 사용자 입력을 직접 넣지 마 (sanitize 필수)
- [ ] 한 파일에 500줄 이상 쓰지 마 (컴포넌트 분리)

---

## 항상 해 (ALWAYS DO)

- [ ] 변경하기 전에 계획을 먼저 보여줘
- [ ] 환경변수는 .env.local에 저장
- [ ] 에러가 발생하면 사용자에게 한국어 친절한 메시지 표시
- [ ] 모바일에서도 사용 가능한 반응형 디자인
- [ ] Supabase 쿼리 시 workspace_id 필터링 (데이터 격리)
- [ ] API 라우트에서 입력값 검증 (빈 값, 타입 체크)
- [ ] 새 기능 추가 시 기존 기능이 깨지지 않는지 빌드 테스트
- [ ] TypeScript strict 모드 준수

---

## 테스트 방법

```bash
# 로컬 실행 (#5 경로 이슈로 /tmp에 복사)
cp -R "$(pwd)" /tmp/video-script-ai-build && cd /tmp/video-script-ai-build
npm run dev -- -p 4000

# 타입 체크
npx tsc --noEmit

# 빌드 확인
npm run build
```

---

## 배포 방법

1. GitHub 리포지토리: `junoflon/video-script-ai`
2. Vercel에 연결: `vercel.com` → Import Git Repository
3. 환경변수 설정:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 자동 배포: main 브랜치 push 시 자동 배포

---

## 환경변수

| 변수명 | 설명 | 어디서 발급 |
|--------|------|------------|
| ANTHROPIC_API_KEY | Claude API 키 | console.anthropic.com |
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | supabase.com → Settings → API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 공개 키 | supabase.com → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 서버 전용 키 | supabase.com → Settings → API |

> .env.local 파일에 저장. 절대 GitHub에 올리지 마세요.

---

## [NEEDS CLARIFICATION]

- [ ] Supabase 프로젝트 리전 선택 (한국 사용자 → ap-northeast-1 추천)
- [ ] Vercel 무료 플랜 제한 (서버리스 함수 10초 → Claude API 응답 시간 충분한지)
- [ ] 이미지/파일 저장 시 Supabase Storage vs 외부 CDN
