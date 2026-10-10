# PRD 적용 확인 — v0.2.2

2026-10-10 현재 PRD와 코드를 대조했다. 기존의 핵심 기능은 구현되어 있었으며, v0.2에서 사용 흐름과 저장·내보내기의 완성도를 보완했다. ‘구현’과 실제 API/물리 기기 검증은 구분한다.

| PRD 항목 | 상태와 보완 | 검증 근거 |
| --- | --- | --- |
| 30개 사례, 학교급·주제·난도 필터 | 구현. 조건 초기화 추가 | core, browser, v02-browser |
| 신청서 읽기 후 바로 사전모임 | 구현. 입력·검토 관문 없음 | application, intake-browser |
| 안내 → 있었던 일 듣기, 대상별 순서 | 구현 | application, intake-browser |
| 학생 6명·주제 삽화 7장 | 구현, 생성 정보 포함 | HTTP 자산 검사·화면 검사 |
| 사전·본·사후모임, 대화·합의 유지 | 구현. 진행 중 전체 대화 보기 추가 | core, browser, v02-browser |
| 협력·방어·중단·미이행 | 구현, 거절 시 본모임 차단 유지 | core, application, browser |
| 객관식·직접 입력·마이크 | 구현. 음성 인식은 모의 객체로 검사 | browser |
| 학생 발언 기반 선택지 | 구현. AI 생성과 발언 참고 예시 구별 | followups, followups-browser |
| Claude·Gemini·OpenAI 키 입력·연결 확인 | 구현. 키 비저장·고정 API 주소 | providers, server, browser |
| 체험 모드·AI 모드 구별, 몰래 대체 없음 | 구현 | browser, followups-browser |
| 서비스별 오류·재시도·실패 시 문장 유지 | 구현 | providers, followups-browser |
| 개별 사전면담 격리 | 구현. 상대별 초안도 분리, API에 초안/선택지 미전송 | core, followups, workspace, browser |
| 진행 확인·단계 조건 | 구현. 미확인 항목·빈 기록과 준비 상태 안내 추가 | workspace, v02-browser |
| 기록 저장·재개·삭제·내려받기 | 구현. 작성 중인 문장·발문 방식·선택 문장 복원, 내보내기에 회고 포함 | workspace, browser, v02-browser |
| 코치와 회고 | 구현. 실제 질문 참고 장면 추가. 점수·공식 판정 없음 | core, workspace, v02-browser |
| PC·모바일 구분, 큰 글자·부드러운 움직임 | 구현. 시작/진행/회고 화면 다듬기 | responsive, followups-browser, v02-browser |
| PC 대화·예시를 한 화면에 표시 | 창 높이 고정, 선택 문장 전체 보기, 오른쪽 진행 노트 전환 | desktop-room, browser, responsive |
| 모바일 선택 즉시 대화창 이동 | 구현 유지, 자동 전송 없음 | followups-browser |
| 버전업·GitHub 저장소 | v0.2.2, 버전 일치 검사·CI 추가 | workspace, GitHub Actions |
| 공개 웹 접속과 AI 중계 | HTTPS 화면 + Vercel Node.js 함수, GitHub main 자동 배포 | hosting, hosting-live |
| 웹 첫 로딩 | WebP 13장, 합계 약 95% 용량 절감 | HTTP MIME·브라우저 화면 검사 |

## 검증 범위

- 로컬 Node 단위·HTTP 검사, Chrome PC/모바일 크기 320·390·768·1024·1440px 및 큰 글자 검사.
- 실제 API 키를 사용하지 않았다. 세 제공사 호출과 오류·선택지·AI 회고는 모의 응답으로 검사했다. 사용자의 ‘잘 적용됩니다’ 피드백과 별개로 계정별 전체 조합을 검증했다고 주장하지 않는다.
- 실제 휴대전화, 물리 마이크, Safari/Firefox, 현장 교육 효과는 확인하지 않았다.
- 후속 요청에 따라 v0.2.1에서 공개 웹 배포를 추가했다. 로그인·기록 공유·실제 학생 정보 수집은 추가하지 않았다.
