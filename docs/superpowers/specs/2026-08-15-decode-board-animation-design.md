# Decode Board Animation — Design Spec

> 검색 입력 후 공항 안내판(split-flap) 스타일로 다국어 문자를 순환하며 해독하는 애니메이션
> 작성일 2026-08-15

---

## 1. 컨셉

**"Decode Board"** — 사용자가 검색어를 입력하고 Enter를 누르면, 공항 출발 안내판처럼 글자가 여러 문자 체계(Latin → Katakana → CJK → Hangul)를 빠르게 순환하다가 하나씩 정답에 "딱" 멈추는 연출.

**핵심 감각:** "시스템이 내 대충 친 글자를 여러 언어로 대조해보다가 답을 찾아냈다."

---

## 2. 인터랙션 플로우

### 상태 머신

```
idle → expanding → decoding → resolved → idle
         ↑                        │
         └────── (새 검색) ────────┘
```

### 5단계 플로우

| Phase | 이름 | 화면 | 트리거 |
|---|---|---|---|
| 1 | 입력 | 검색창 + 태그라인 + 인기 칩 | 초기 상태 |
| 2 | 확장 | 보드 영역 높이 0 → 목표 높이 (300ms ease-out) | Enter / 검색 버튼 |
| 3 | 해독 | FlapSlot들이 다국어 문자 순환 | expand 애니메이션 완료 |
| 4 | 결과 확정 | 글자 고정 (오렌지) + 결과 카드 슬라이드 인 | API 응답 + 최소 시간 충족 |
| 5 | 행동 | 신뢰도별 CTA 분기 | 결과 카드 표시 완료 |

### 동작 변경 (Before → After)

- **Before:** 타이핑 → 200ms 디바운스 → 인라인 결과 (실시간)
- **After:** 타이핑 → Enter/검색 → 디코드 보드 확장 → 애니메이션 → 결과

실시간 디바운스 피드백은 제거. 디코드 보드의 극적인 연출이 검색 경험 전체를 대체.

---

## 3. 컴포넌트 구조

```
TransshipmentStrip (리팩터 — DecodeBoard 래퍼)
├── SearchHero                     ← 검색 입력 + 태그라인
│
├── DecodeBoard                    ← 오케스트레이터
│   ├── DecodeBoardRow "IN"        ← 입력 텍스트 표시
│   ├── DecodeBoardRow "OUT"       ← 해독 애니메이션 행
│   │   └── FlapSlot × N          ← 개별 글자 슬롯
│   └── DecodeResult               ← 해독 완료 후 결과 카드
│
└── PopularChips                   ← 인기 검색 칩
```

### FlapSlot 상태

```
waiting → cycling → decelerating → locked
```

---

## 4. 비주얼 사양

### 보드 외형

```css
.decode-board {
  background: #1A1D1F;
  border-radius: 8px;
  padding: 2rem 1.5rem;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.03) inset,
    0 20px 60px rgba(0,0,0,0.3);
}
```

### FlapSlot

```
┌─────────┐
│    海    │  ← 상단 절반 (overflow hidden)
├─────────┤  ← 크리즈 라인 (1px, rgba(0,0,0,0.4))
│    海    │  ← 하단 절반
└─────────┘

배경: #2A2D30
테두리: 1px solid rgba(255,255,255,0.06)
글자 (순환 중): #C8CCD0
글자 (고정 시): #FF4D14 (--signal)
크기: 2.5rem × 3rem (모바일) / 3.5rem × 4.5rem (데스크톱)
간격: 슬롯 간 4px
font-family: "JetBrains Mono", monospace
```

### IN/OUT 라벨

```
IN   — JetBrains Mono, 0.75rem, letter-spacing: 0.15em, color: #5A5F63
OUT  — 동일 스타일
       해독 완료 시 OUT → RESOLVED, color: #FF4D14
```

### 문자 순환 세트

```ts
const DECODE_CHARS_BY_SCRIPT = {
  latin:    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  katakana: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ'.split(''),
  cjk:      '海雲台山川寺市場港島城橋路門浦津洞里'.split(''),
  hangul:   '가나다라마바사아자차카타파하해운대부산리'.split(''),
};
```

순환 순서: latin → katakana → cjk → hangul → latin → ... (스크립트 순서대로, 랜덤 아님)

---

## 5. 애니메이션 타이밍

### FlapSlot 순환 곡선

| Phase | Duration | Flip Interval | 비고 |
|---|---|---|---|
| cycling | ~800ms | 50ms/flip | 빠른 순환, 스크립트 순서 |
| decelerating | ~400ms | 50→100→200ms | 감속 |
| lock | instant | - | 정답 글자 + 오렌지 + scale(1.08→1.0, 150ms) |

### 슬롯 간 스태거

```
slot[0]: 시작 즉시
slot[1]: +120ms
slot[2]: +240ms
...
slot[n]: n × 120ms

전체 해독 시간:
  최소 1200ms + (글자수 × 120ms)
  "해운대" (3글자) = ~1.56초
  "해운대해수욕장" (7글자) = ~2.04초
```

### API 응답 동기화

```ts
const [apiResult] = await Promise.all([
  fetchResolve(query),      // 실제 API
  delay(MIN_DECODE_TIME),   // 최소 1200ms
]);
// 둘 다 완료 → deceleration 시작
```

- API 먼저 도착: 결과를 보관, 최소 시간 이후 잠금 시작
- API 더 느림: cycling 계속, 응답 오는 즉시 잠금 시작
- 최대 대기: 5초, 초과 시 타임아웃 에러 표시

### 결과 카드 진입

```
마지막 슬롯 lock 후 +200ms
opacity: 0 → 1
translateY: 12px → 0
duration: 400ms ease-out
```

### 결과 카드 내용 (신뢰도별)

| 신뢰도 | 표시 |
|---|---|
| ≥ 0.9 단일 후보 | 장소명 + 다국어 표기 + "Go to [장소]" CTA |
| ≥ 0.6 | 장소명 + 다국어 표기 + "Is this right?" 확인 |
| < 0.6 | "Did you mean?" + 후보 3건 리스트 |
| 후보 없음 | "That one's not in our yard yet." + 인기 장소 칩 |

---

## 6. prefers-reduced-motion

```
reduced-motion 활성 시:
- FlapSlot 순환 없이 바로 정답 글자 표시
- 확장(expanding)은 height transition → 즉시 표시 (fade 0→1, 200ms)
- 결과 카드도 fade만 (translateY 없음)
```

---

## 7. 반응형

| Breakpoint | 슬롯 크기 | 보드 패딩 | 비고 |
|---|---|---|---|
| < 480px | 2rem × 2.5rem, font 1.25rem | 1rem | 최대 8슬롯, 초과 시 줄바꿈 |
| 480–768px | 2.5rem × 3rem, font 1.5rem | 1.5rem | |
| > 768px | 3.5rem × 4.5rem, font 2.25rem | 2rem | |

---

## 8. 파일 구조

### 신규 파일

```
src/components/user/decode-board/
├── DecodeBoard.tsx              ← 오케스트레이터 (상태 머신 + API 동기화)
├── DecodeBoardRow.tsx           ← IN/OUT 행 (FlapSlot 배열)
├── FlapSlot.tsx                 ← 개별 글자 슬롯 (핵심 애니메이션)
├── DecodeResult.tsx             ← 해독 완료 후 결과 카드
├── constants.ts                 ← 문자 세트, 타이밍 상수
└── use-decode-animation.ts      ← 애니메이션 타이밍 오케스트레이션 훅
```

### 수정 파일

```
src/components/user/TransshipmentStrip.tsx  ← DecodeBoard로 교체
src/app/[lang]/page.tsx                     ← 검색 Submit 방식으로 전환
src/app/globals.css                         ← 디코드 보드 키프레임 추가
src/lib/hooks/use-resolve.ts                ← Promise 기반 resolve 추가
```

---

## 9. 작업 순서

| # | 작업 | 의존성 | 병렬 가능 |
|---|---|---|---|
| 1 | constants.ts — 문자 세트, 타이밍 상수 | 없음 | - |
| 2 | FlapSlot.tsx + CSS 키프레임 | 1 | - |
| 3 | DecodeBoardRow.tsx — 슬롯 배열 + 스태거 | 2 | - |
| 4 | use-decode-animation.ts — 상태 머신 + API 동기화 | 1 | 2,3과 병렬 |
| 5 | DecodeResult.tsx — 결과 카드 | 없음 | 2,3,4와 병렬 |
| 6 | DecodeBoard.tsx — 전체 조립 | 3, 4, 5 | - |
| 7 | 통합 — TransshipmentStrip 교체, 홈 페이지 연결 | 6 | - |
| 8 | 반응형 + reduced-motion + 엣지 케이스 | 7 | - |

---

## 10. 테스트 항목

- FlapSlot: waiting → cycling → decelerating → locked 상태 전이
- DecodeBoard: idle → expanding → decoding → resolved 상태 머신
- API 동기화: 빠른 응답 / 느린 응답 / 타임아웃 / 네트워크 에러
- reduced-motion: 모션 비활성화 시 즉시 표시 확인
- 반응형: 360px ~ 1440px 레이아웃 확인
- 장문 결과: 7글자 이상 한글 명칭 처리
- 재검색: resolved → 새 검색 → expanding 전환

---

## 참고 레퍼런스

- [react-split-flap-display](https://github.com/daformat/react-split-flap-display) — CSS 3D 기법 참고
- [hello-mat split-flap](https://hello-mat.com/design-engineering/component/split-flap-display) — compound component 패턴 참고
- [Airport Board CodePen](https://codepen.io/artsunique/pen/jOdORNY) — 비주얼 레퍼런스
- [Departure board flipping letters](https://codepen.io/jackarmley/pen/kyZzwJ) — 플립 모션 참고
