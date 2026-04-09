# ScriptFlow -- 디자인 문서

> Show Me The PRD로 생성됨 (2026-04-07)

## 문서 구성

| 문서 | 내용 | 언제 읽나 |
|------|------|----------|
| [01_PRD.md](./01_PRD.md) | 뭘 만드는지, 누가 쓰는지 | 프로젝트 시작 전 |
| [02_DATA_MODEL.md](./02_DATA_MODEL.md) | 데이터 구조 | DB 설계할 때 |
| [03_PHASES.md](./03_PHASES.md) | 단계별 계획 | 개발 순서 정할 때 |
| [04_PROJECT_SPEC.md](./04_PROJECT_SPEC.md) | AI 규칙 | AI에게 코드 시킬 때마다 |

## 제품 요약

**ScriptFlow**는 YouTube 영상을 AI로 분석하여 팀이 함께 활용할 수 있는 콘텐츠 도구입니다.

- **대상**: 콘텐츠 크리에이터, 마케터 팀
- **방향**: B2B 사내 도구
- **기술**: Next.js 16 + Supabase + Claude API
- **인증**: 로그인 없음 (접근 코드 방식)

## 현재 상태

- Phase 0 (개인 도구): ✅ 완성 — 자막 추출, AI 요약, 변환, PDF
- Phase 1 (팀 도구): 시작 전

## 다음 단계

Phase 1을 시작하려면 [03_PHASES.md](./03_PHASES.md)의 "Phase 1 시작 프롬프트"를 참고하세요.

## 미결 사항

- [ ] 워크스페이스당 최대 멤버 수 제한
- [ ] 분석 결과 보관 기간
- [ ] Claude API 비용 부담 구조
- [ ] 커스텀 템플릿 커스터마이징 범위
- [ ] Supabase 프로젝트 리전
- [ ] Vercel 무료 플랜 서버리스 함수 시간 제한
