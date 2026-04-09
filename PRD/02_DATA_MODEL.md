# ScriptFlow -- 데이터 모델

> 이 문서는 앱에서 다루는 핵심 데이터의 구조를 정의합니다.
> 개발자가 아니어도 이해할 수 있는 "개념적 ERD"입니다.

---

## 전체 구조

```
[Workspace] --1:N--> [Project] --1:N--> [Analysis]
     |                                      |
     └--1:N--> [Member]                     ├--1:N--> [Comment]
                                            └--N:1--> [Template]

[Template] -- 워크스페이스 단위로 공유
```

---

## 엔티티 상세

### Workspace (워크스페이스)
팀이 함께 사용하는 공간. 접근 코드로 입장.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 (자동 생성) | ws_abc123 | O |
| name | 워크스페이스 이름 | "마케팅팀" | O |
| access_code | 입장 코드 (6자리) | "MKT-2026" | O |
| created_at | 만든 날짜 (자동) | 2026-04-07 | O |

### Member (멤버)
워크스페이스에 참여한 사람. 로그인 없이 닉네임만.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | mem_xyz789 | O |
| workspace_id | 소속 워크스페이스 | ws_abc123 | O |
| nickname | 표시 이름 | "김마케터" | O |
| role | 역할 | "admin" / "member" | O |
| created_at | 참여 날짜 | 2026-04-07 | O |

### Project (프로젝트)
분석 결과를 묶는 폴더.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | proj_def456 | O |
| workspace_id | 소속 워크스페이스 | ws_abc123 | O |
| name | 프로젝트 이름 | "Q2 경쟁사 분석" | O |
| description | 설명 | "경쟁 채널 콘텐츠 분석" | X |
| created_by | 만든 멤버 | mem_xyz789 | O |
| created_at | 만든 날짜 | 2026-04-07 | O |

### Analysis (분석 결과)
하나의 영상 분석 데이터.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | ana_ghi012 | O |
| project_id | 소속 프로젝트 | proj_def456 | O |
| video_url | 원본 영상 URL | "https://youtube.com/..." | O |
| video_id | YouTube 영상 ID | "dQw4w9WgXcQ" | O |
| video_title | 영상 제목 | "마케팅 전략 2026" | X |
| video_author | 채널명 | "마케팅학교" | X |
| thumbnail_url | 썸네일 | "https://img.youtube.com/..." | X |
| transcript | 자막 데이터 (JSON) | [{text, offset, duration}...] | O |
| full_text | 전체 자막 텍스트 | "안녕하세요 오늘은..." | O |
| structured_summary | AI 구조화 요약 (JSON) | {oneSentence, sections...} | O |
| created_by | 분석한 멤버 | mem_xyz789 | O |
| created_at | 분석 날짜 | 2026-04-07 | O |

### Comment (댓글)
분석 결과에 대한 팀원 피드백.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | cmt_jkl345 | O |
| analysis_id | 대상 분석 | ana_ghi012 | O |
| member_id | 작성자 | mem_xyz789 | O |
| content | 댓글 내용 | "이 부분 블로그에 활용하자" | O |
| created_at | 작성 날짜 | 2026-04-07 | O |

### Template (커스텀 템플릿)
워크스페이스에서 공유하는 변환 포맷.

| 필드 | 설명 | 예시 | 필수 |
|------|------|------|------|
| id | 고유 식별자 | tpl_mno678 | O |
| workspace_id | 소속 워크스페이스 | ws_abc123 | O |
| name | 템플릿 이름 | "우리팀 블로그 스타일" | O |
| type | 변환 유형 | "blog" / "presentation" / "study" / "custom" | O |
| prompt | AI 프롬프트 | "다음 톤으로 작성..." | O |
| created_by | 만든 멤버 | mem_xyz789 | O |
| created_at | 만든 날짜 | 2026-04-07 | O |

---

## 관계

- Workspace 1개에 여러 Member가 참여
- Workspace 1개에 여러 Project가 포함
- Project 1개에 여러 Analysis가 포함
- Analysis 1개에 여러 Comment가 달림
- Workspace 1개에 여러 Template이 저장
- Template 1개를 여러 Analysis 변환에 적용 가능

---

## 왜 이 구조인가

- **확장성**: Phase 2에서 다중 소스(파일, 웹페이지)를 추가할 때 Analysis 엔티티에 `source_type` 필드만 추가하면 됨
- **단순성**: 로그인 없이 접근 코드 + 닉네임으로 운영하여 Member 관리가 가벼움
- **B2B 적합**: Workspace > Project > Analysis 3계층 구조가 팀/프로젝트/작업 단위를 자연스럽게 표현

---

## [NEEDS CLARIFICATION]

- [ ] transcript, structured_summary를 JSON 컬럼으로 저장할지, 별도 테이블로 분리할지
- [ ] 분석 결과의 최대 저장 크기 제한
- [ ] 삭제된 분석/프로젝트의 soft delete vs hard delete
