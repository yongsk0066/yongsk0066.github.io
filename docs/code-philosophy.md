# Code Philosophy: Readable Flow Architecture

> 코드는 사고의 흐름이다. 읽는 사람이 자연스럽게 따라갈 수 있어야 하고,
> 새로운 참여자가 길을 잃지 않아야 한다.

한 문장으로 요약하면: **Readable, Declarative, Well-bounded Abstraction** — 이 세 축의 균형 위에 서 있는 코드.

---

## 핵심 원칙

### 1. Cognitive Flow First — 사고의 흐름을 보존하라

코드의 최우선 목표는 **읽는 사람의 인지 흐름을 끊지 않는 것**이다.

좋은 코드는 위에서 아래로 읽었을 때 "그래서 다음엔 뭘 하지?"라는 질문에 코드 자체가 답한다. 주석이 아니라 구조와 이름이 그 역할을 한다.

- 함수 이름은 **의도(what)**를 드러내고, 내부 구현은 **방법(how)**을 숨긴다.
- 한 파일을 읽을 때 다른 파일 3개를 동시에 열어야 이해되는 구조는 실패한 구조다.
- 코드의 흐름은 독자의 자연스러운 질문 순서를 따라야 한다.

```
// ❌ 흐름이 끊기는 코드 — 읽다가 맥락을 잃는다
const result = pipe(data, transformA, transformB, transformC)
// transformA, B, C가 각각 다른 모듈에 흩어져 있고,
// 왜 이 순서인지, 무엇을 하는지 이름만으로 알 수 없다

// ✅ 흐름이 유지되는 코드 — 선언적이되 의도가 명확하다
const pricing = data
  |> normalizeRawInput
  |> applyDiscountPolicy
  |> calculateFinalPrice
// 각 단계가 도메인 언어로 읽히고, 순서 자체가 비즈니스 로직을 설명한다
```

### 2. Contextual Locality — 맥락은 가까이 두어라

새로운 참여자가 코드를 이해하는 데 드는 비용은 **파일 간 점프 횟수에 비례**한다.

관련된 코드는 물리적으로 가까이 있어야 한다. 단, "가까이"는 모든 것을 한 파일에 넣으라는 뜻이 아니다. **하나의 관심사를 이해하기 위해 필요한 맥락이 한 곳에 모여 있어야 한다**는 뜻이다.

이 원칙의 전제는 **책임 분리(Separation of Concerns)**다. 먼저 책임의 경계를 올바르게 나눈 뒤, 같은 책임에 속하는 것들을 가까이 두는 것이 응집도의 순서다.

- 응집도(Cohesion)는 "같은 이유로 변경되는 것들"을 기준으로 판단한다.
- 재사용성을 위한 과도한 분리는 오히려 맥락을 파편화시킨다.
- **"이 코드를 처음 보는 사람이 몇 개의 파일을 열어야 하는가?"** 를 항상 자문한다.

```
// ❌ 과도한 분리 — 컨텍스트가 흩어진다
src/
  hooks/usePayment.ts        ← 로직
  components/PaymentForm.tsx  ← UI
  utils/paymentValidation.ts  ← 검증
  types/payment.ts            ← 타입
  constants/payment.ts        ← 상수

// ✅ 맥락 중심의 응집 — 하나의 관심사가 한 곳에
src/
  features/payment/
    PaymentForm.tsx           ← UI + 이 폼에서만 쓰이는 로직
    payment.model.ts          ← 도메인 로직, 타입, 검증 규칙
    index.ts                  ← 외부에 노출할 인터페이스
```

### 3. Abstraction as a Wall, Not a Maze — 추상화는 벽이지 미로가 아니다

추상화는 **복잡성을 숨기는 벽**이어야 한다. 벽 앞에 선 사람은 벽 너머를 몰라도 자기 일을 할 수 있어야 한다. 하지만 벽이 너무 많으면 미로가 된다.

- 추상화 레이어는 **필요할 때만** 도입한다. "나중에 필요할 수 있으니까"는 근거가 아니다.
- 좋은 추상화는 **사용하는 쪽의 코드를 단순하게** 만든다.
- 추상화의 경계(인터페이스)는 명확하되, 내부 구현을 궁금하게 만들지 않아야 한다.

```
// ❌ 미로형 추상화 — 레이어를 따라가다 길을 잃는다
const service = new PaymentServiceFactory()
  .createService(config)
  .withMiddleware(loggingMiddleware)
  .build()

// ✅ 벽형 추상화 — 사용하는 쪽은 내부를 몰라도 된다
const result = await processPayment({ amount, method, userId })
// processPayment 내부가 어떻게 구현되어 있든,
// 이 한 줄이 하는 일은 명확하다
```

### 4. Declarative by Default — 기본은 선언적으로

코드는 가능한 한 **"무엇을 하는가"** 를 표현해야 하고, **"어떻게 하는가"** 는 한 단계 안쪽에 숨겨야 한다.

선언적 코드는 읽는 사람이 실행 과정을 머릿속에서 시뮬레이션하지 않아도 전체 그림을 파악할 수 있게 해준다.

```
// ❌ 명령형 — 읽는 사람이 루프를 머릿속에서 돌려야 한다
const activeUsers = []
for (const user of users) {
  if (user.status === 'active') {
    if (user.lastLogin > threshold) {
      activeUsers.push({ ...user, tier: calculateTier(user) })
    }
  }
}

// ✅ 선언적 — 의도의 파이프라인
const activeUsers = users
  .filter(isActive)
  .filter(hasRecentLogin(threshold))
  .map(withCalculatedTier)
```

---

## 패러다임에 대한 태도: Pragmatic Pluralism

특정 패러다임에 교조적으로 따르지 않는다. **문제의 성격이 도구를 결정한다.**

상위 가이드라인은 **Functional Core, Imperative Shell** — 핵심 비즈니스 로직은 순수 함수로, 부수효과(IO, 외부 연동)는 바깥 껍질에 모은다. 이 경계 위에서 함수형과 클래스 기반을 적재적소에 배치한다.

### 함수형이 어울리는 곳

**데이터의 변환과 흐름**이 핵심인 곳에서는 함수형 스타일이 자연스럽다.

- 입력 → 변환 → 출력의 파이프라인 구조
- 부수효과 없는 순수한 비즈니스 로직
- 선언적 UI 렌더링
- 데이터 필터링, 매핑, 집계

```typescript
// 함수형이 자연스러운 경우: 데이터 변환 파이프라인
const dashboardData = pipe(
  rawTransactions,
  groupByCategory,
  calculateCategorySummary,
  sortByAmount("desc"),
  takeTop(10)
);
```

### 클래스 기반이 어울리는 곳

**상태와 생명주기를 캡슐화**해야 하는 곳에서는 클래스가 더 직관적이다.

- 명확한 생명주기가 있는 객체 (연결, 세션, 캐시)
- 내부 상태를 보호하면서 일관된 인터페이스를 제공해야 할 때
- 여러 메서드가 같은 내부 상태를 공유하는 경우

```typescript
// 클래스가 자연스러운 경우: 상태와 생명주기 캡슐화
class WebSocketConnection {
  private socket: WebSocket;
  private reconnectAttempts = 0;

  connect(url: string): void {
    /* ... */
  }
  send(message: Message): void {
    /* ... */
  }
  disconnect(): void {
    /* ... */
  }
}
```

### 판단 기준

| 질문                                       | 함수형      | 클래스 기반 |
| ------------------------------------------ | ----------- | ----------- |
| 핵심이 데이터 변환인가, 상태 관리인가?     | 데이터 변환 | 상태 관리   |
| 부수효과가 핵심인가, 격리 가능한가?        | 격리 가능   | 핵심        |
| 동작이 독립적인가, 서로 상태를 공유하는가? | 독립적      | 공유        |
| 테스트할 때 입출력만 보면 되는가?          | 예          | 아니오      |

---

## 실천 지침

### 새 참여자 관점 체크리스트

모든 구조적 결정에서 다음을 자문한다:

1. **3-File Rule** — 이 기능을 이해하기 위해 3개 이상의 파일을 동시에 열어야 하는가? 그렇다면 응집도를 재검토한다.
2. **Narration Test** — 이 코드를 위에서 아래로 읽으며 동료에게 설명할 수 있는가? 설명이 자연스럽지 않다면 흐름이 끊긴 것이다.
3. **Naming Sufficiency** — 함수/변수 이름만으로 주석 없이 의도가 전달되는가?
4. **Grep Friendliness** — 특정 기능이 어디에 있는지 파일명이나 폴더 구조만으로 추측할 수 있는가?

### 경계해야 할 것

- **이른 추상화(Premature Abstraction)** — 반복이 2~3번 발생하기 전에 추상화하지 않는다.
- **맥락 없는 재사용** — `utils/`에 무분별하게 쌓이는 함수들. 맥락 없이 존재하는 코드는 발견되지 않는다.
- **기술 중심 분류** — `hooks/`, `components/`, `utils/`로 나누는 것보다 도메인/기능 중심으로 나누는 것이 맥락을 보존한다.
- **과도한 DRY** — 중복 제거가 응집도를 해칠 때가 있다. 두 코드가 우연히 비슷한 것인지, 본질적으로 같은 것인지 구분한다.

### 좋은 코드의 신호

- 새 팀원이 온보딩 첫 날에 하나의 기능을 end-to-end로 따라갈 수 있다.
- 코드 리뷰에서 "이게 어디 있어요?"라는 질문이 나오지 않는다.
- 변경이 필요할 때 영향 범위가 직관적으로 예측된다.
- 코드를 읽으면 비즈니스 로직이 보이고, 프레임워크가 보이지 않는다.

---

## 영향을 준 사상들

이 철학은 다음 사상들의 교차점에 위치한다:

- **SICP** — Abstraction Barrier, 선언적 사고의 근본
- **Kent Beck의 Simple Design** — 의도를 드러내고, 최소 요소로 구성한다
- **Functional Core, Imperative Shell** (Gary Bernhardt) — 핵심은 순수하게, 부수효과는 경계에서
- **Screaming Architecture** (Robert C. Martin) — 코드 구조가 프레임워크가 아닌 도메인을 드러내야 한다
- **Domain-Driven Design** — 코드가 도메인 언어를 말하게 한다
- **Colocation Principle** — 함께 변경되는 것은 함께 둔다

---

_"Programs must be written for people to read, and only incidentally for machines to execute."_
_— Abelson & Sussman, SICP_

_"코드는 작성하는 시간보다 읽히는 시간이 압도적으로 길다. 읽는 사람의 인지 흐름을 최우선으로 설계하라."_
