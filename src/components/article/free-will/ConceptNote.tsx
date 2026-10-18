import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { bloch, cantor, chsh, lorenz } from "./physics";
import "./concept-note.css";

export type Topic =
  | "epr"
  | "bell"
  | "chsh"
  | "guiding"
  | "hilbert"
  | "attractor"
  | "cantor"
  | "bloch";
const meta: Record<
  Topic,
  { title: string; subtitle: string; lead: string; sources: [string, string][] }
> = {
  epr: {
    title: "EPR 논문",
    subtitle: "예측이 맞는다는 것과 설명이 완전하다는 것",
    lead: "EPR은 Einstein·Podolsky·Rosen, 세 저자의 성을 딴 약칭이다. 논문의 질문은 ‘양자역학의 설명이 물리적 실재를 빠짐없이 담고 있는가?’였다.",
    sources: [["1935년 EPR 원문", "https://doi.org/10.1103/PhysRev.47.777"]],
  },
  bell: {
    title: "벨의 부등식",
    subtitle: "상자 속 동전의 설명은 측정 방향을 바꿔도 통할까",
    lead: "벨의 부등식은 자연이 우리가 생각하는 고전적인 인과관계만으로 설명될 수 있는지 시험하는 수학적 조건이다. 멀리 떨어진 두 입자가 미리 가진 정보만으로 답한다면, 두 결과의 관계에는 넘을 수 없는 한계가 생긴다.",
    sources: [
      ["Bell, 1964", "https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195"],
      ["CHSH, 1969", "https://doi.org/10.1103/PhysRevLett.23.880"],
      ["Hensen 외, 2015", "https://arxiv.org/abs/1508.05949"],
    ],
  },
  chsh: {
    title: "CHSH 부등식",
    subtitle: "미리 맞춘 답안은 왜 75%가 한계이고, 얽힘은 어떻게 다를까",
    lead: "CHSH 부등식은 벨의 부등식의 한 종류다. 두 입자가 미리 가진 국소적인 정보만으로 반응한다는 설명을 실험으로 시험할 수 있게 해준다. 흥미로운 것은 양자역학에서는 그 한계를 실제로 넘어선다는 것이다.",
    sources: [
      ["CHSH 원문", "https://doi.org/10.1103/PhysRevLett.23.880"],
      [
        "IBM Quantum · CHSH 게임",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/chsh-game",
      ],
    ],
  },
  guiding: {
    title: "유도 방정식",
    subtitle: "현재의 파동함수와 위치가 다음 움직임을 정하는 방법",
    lead: "드브로이–봄의 유도 방정식(Guiding Equation)은 입자가 실제 위치와 궤적을 가지며, 그 움직임이 파동함수에 의해 결정된다는 생각을 수학적으로 표현한 방정식이다.",
    sources: [
      [
        "Berndl 외 · A Survey on Bohmian Mechanics",
        "https://arxiv.org/abs/quant-ph/9504010",
      ],
      [
        "Goldstein · Bohmian Mechanics",
        "https://plato.stanford.edu/entries/qm-bohm/",
      ],
    ],
  },
  hilbert: {
    title: "힐베르트 공간과 기저 벡터",
    subtitle: "같은 상태도 기준에 따라 다르게 표현되는 이유",
    lead: "힐베르트 공간(Hilbert Space)과 기저 벡터(Basis Vector)는 양자역학을 이해하는 데 중요한 개념이다.",
    sources: [
      [
        "IBM Quantum · 상태 벡터와 기저",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM Quantum · 여러 입자의 상태와 얽힘",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/multiple-systems/quantum-information",
      ],
      ["’t Hooft · 세포 자동자 해석", "https://arxiv.org/abs/1405.1548"],
      [
        "MIT · 내적과 완비성 (72쪽)",
        "https://ocw.mit.edu/courses/18-102-introduction-to-functional-analysis-spring-2021/8fb8d5c170f1613151aca71de21027bc_MIT18_102s21_full_lec.pdf#page=72",
      ],
    ],
  },
  attractor: {
    title: "끌개와 기묘한 끌개",
    subtitle: "같은 구조에 모여도, 왜 장기 예측은 어려울까",
    lead: "끌개(Attractor)와 기묘한 끌개(Strange Attractor)는 결정론과 예측 가능성이 서로 다르다는 것을 이해하는 데 도움이 되는 개념이다.",
    sources: [
      [
        "John Milnor · Attractor",
        "https://www.scholarpedia.org/article/Attractors",
      ],
      [
        "Lorenz, 1963",
        "https://doi.org/10.1175/1520-0469%281963%29020%3C0130%3ADNF%3E2.0.CO%3B2",
      ],
      [
        "MIT · 기묘한 끌개",
        "https://ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec19.pdf",
      ],
      [
        "MIT · 로렌츠 방정식",
        "https://live.ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec20-21.pdf",
      ],
    ],
  },
  cantor: {
    title: "프랙탈과 칸토어 집합",
    subtitle: "길이는 0인데 점은 남고, 작은 부분에 전체 구조가 반복된다",
    lead: "칸토어 집합(Cantor Set)은 선분의 가운데 1/3을 지우는 일을 끝없이 반복해 만드는 프랙탈의 한 예다. 복잡한 그림 없이도 작은 부분에 전체와 같은 구조가 나타난다는 뜻을 살펴볼 수 있다.",
    sources: [
      [
        "Shuyi Weng · 칸토어 집합의 구성 (2.2절)",
        "https://e.math.cornell.edu/people/belk/projects/ShuyiWeng.pdf",
      ],
      [
        "Scott Sutherland · 칸토어 집합과 자기유사성",
        "https://www.math.stonybrook.edu/~scott/papers/Book331/Cantor_sets.html",
      ],
    ],
  },
  bloch: {
    title: "블로흐 구면",
    subtitle: "같은 50:50 확률이어도 서로 다른 양자 상태일 수 있다",
    lead: "블로흐 구면(Bloch Sphere)은 큐비트(Qubit) 하나의 순수 양자 상태를 3차원 구면 위의 점으로 시각화하는 수학적 도구다.",
    sources: [
      [
        "IBM Quantum · 블로흐 구면",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM · 위상과 구면으로 상태 읽기",
        "https://quantum.cloud.ibm.com/docs/en/guides/composer",
      ],
      [
        "IBM Quantum · 순수 상태와 블로흐 볼",
        "https://quantum.cloud.ibm.com/learning/en/courses/general-formulation-of-quantum-information/density-matrices/bloch-sphere",
      ],
      [
        "Palmer · 블로흐 구면의 이산화 (2020)",
        "https://doi.org/10.1098/rspa.2019.0350",
      ],
    ],
  },
};

const MathContext = createContext<Record<string, string>>({});
function Equation({ name }: { name: string }) {
  const html = useContext(MathContext)[name];
  return (
    <div className="cn-equation" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      className="cn-diagram"
      viewBox="0 0 520 250"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

function Epr() {
  return (
    <>
      <p>
        양자역학이 실험 결과를 잘 예측한다는 것과, 그것이 자연에 대한 완전한
        설명이라는 것은 같은 말일까? 실제로 존재하는 성질을 이론이 담고 있지
        못하다면, 예측이 맞더라도 설명에는 아직 빠진 부분이 있을 수 있다. 세
        사람이 문제를 제기한 지점은 여기였다.
      </p>
      <p>
        두 입자가 상호작용한 뒤 멀리 떨어져 있다고 가정해 보자. EPR이 다룬
        이상적인 상태에서는 두 입자의 위치 차이와 운동량의 합이 정해져 있다.
        그래서 한쪽의 위치를 측정하면 다른 쪽의 위치를 계산할 수 있고, 한쪽의
        운동량을 측정하면 다른 쪽의 운동량을 계산할 수 있다.
      </p>
      <p>
        그런데 국소성을 받아들인다면, 이쪽에서 무엇을 측정하든 멀리 있는 입자의
        실제 상태가 그 선택 때문에 즉시 바뀌지는 않아야 한다. 상대 입자를
        바꾸지도 않았는데 그 값을 확실히 알 수 있다면, 그 값은 측정으로 새로
        생긴 것이 아니라 원래 그 입자가 가진 성질이라고 볼 수 있지 않을까?
        이것이 EPR이 제시한 실재의 판단 기준이었다.
      </p>
      <p>
        이제 내가 측정할 것을 위치와 운동량 중에서 고른다고 생각해 보자. 위치를
        고르면 상대 입자는 이미 정해진 위치를 가진다고 보게 되고, 운동량을
        고르면 이미 정해진 운동량을 가진다고 보게 된다. 실제로 측정하는 것은 둘
        중 하나다. 하지만 멀리 있는 입자가 어떤 성질을 가지는지가 내 선택에 달려
        있지 않다면, 그 입자는 두 값을 모두 가지고 있어야 한다는 것이 EPR의
        생각이었다.
      </p>
      <p>
        하지만 양자역학의 파동함수는 한 입자의 위치와 운동량을 동시에 정확한
        값으로 지정할 수 없다. 앞의 생각을 그대로 따르면, 실제 입자는 두 값을
        가지고 있는데 파동함수에는 그 정보가 모두 담겨 있지 않은 셈이다. 그래서
        세 사람은 파동함수만으로는 물리적 실재를 완전히 설명할 수 없다고 결론
        내렸다.
      </p>
      <p>
        다만 이 결론에는 멀리 떨어진 입자가 내 측정에 의해 즉시 바뀌지 않는다는
        국소성과, 확실히 예측할 수 있는 값은 실제 성질로 보아야 한다는 판단이
        함께 들어가 있다. 이후 벨의 정리는 국소적인 설명을 유지하면서도
        양자역학이 예측하는 상관관계를 모두 재현할 수 있는지 묻는 데서 출발한다.
      </p>
    </>
  );
}

function Bell() {
  return (
    <div className="cn-lesson">
      <p>
        1964년 존 스튜어트 벨이 제안했고, 1969년에는 CHSH가 실험에 더 널리
        적용할 수 있는 형태로 발전시켰다. 먼저 왜 이런 부등식이 필요했는지부터
        살펴보자.
      </p>

      <h4>상자 속 동전으로 설명할 수 있을까?</h4>
      <p>
        동전 두 개를 하나는 앞면, 다른 하나는 뒷면이 보이게 상자에 넣었다고
        생각해보자. 그 상태가 바뀌지 않도록 해서, 상자 하나는 지구에 두고 다른
        하나는 화성에 보내는 것이다.
      </p>
      <p>지구에서 상자를 열었더니 앞면이 나왔다면?</p>
      <p>
        화성의 상자는 열어 보지 않아도 뒷면이라는 것을 알 수 있다.{" "}
        <strong>상자를 열기 전부터 두 결과가 정해져 있었기 때문이다.</strong>
      </p>
      <p>
        아인슈타인은 양자 얽힘도 이런 식으로 설명할 수 있지 않을까 생각했다.
        입자들이 처음부터 우리가 모르는 정보를 가지고 있고, 그 정보에 따라 측정
        결과가 나온다는 것이다. 이런 추가 정보를 ‘숨은 변수’라고 부른다.
      </p>
      <p>그런데 벨은 여기서 한 가지 질문을 더 던졌다.</p>
      <blockquote>
        <p>
          입자들이 미리 가진 정보로 답하고, 멀리 떨어진 상대편의 측정 선택이 그
          답을 바꾸지 않는다면, 반드시 지켜야 하는 수학적 규칙이 있지 않을까?
        </p>
      </blockquote>
      <p>그리고 실제로 그 규칙을 찾아냈다.</p>

      <h4>세 방향으로 스핀을 측정해 보자</h4>
      <p>
        얽힌 두 스핀 1/2 입자를 앨리스와 밥에게 하나씩 보낸다고 하자. 여기서는{" "}
        <strong>같은 방향으로 측정하면 항상 반대 결과가 나오는 상태</strong>를
        사용할 것이다. 전체 스핀이 0인 단일항 상태이며, 다음처럼 적는다.
      </p>
      <Equation name="bell-singlet" />
      <p>
        각자는 아래 세 방향 중 하나를 골라 자기 입자를 측정한다. 결과는 +1 또는
        −1이다.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 265"
          role="img"
          aria-label="측정 방향 A는 0도, B는 60도, C는 120도. A와 B, B와 C의 간격은 각각 60도이고 A와 C의 간격은 120도다."
        >
          <defs>
            <marker
              id="bell-direction-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <g className="cn-lesson-rays" markerEnd="url(#bell-direction-arrow)">
            <line x1="220" y1="220" x2="430" y2="220" />
            <line x1="220" y1="220" x2="325" y2="38.14" />
            <line x1="220" y1="220" x2="115" y2="38.14" />
          </g>
          <path
            d="M 264 220 A 44 44 0 0 0 242 181.9 A 44 44 0 0 0 198 181.9"
            className="cn-lesson-arc"
          />
          <circle cx="220" cy="220" r="4" fill="currentColor" />
          <text x="447" y="226">
            A (0°)
          </text>
          <text x="330" y="24">
            B (60°)
          </text>
          <text x="68" y="24">
            C (120°)
          </text>
          <text x="272" y="197" className="cn-lesson-angle">
            60°
          </text>
          <text x="220" y="163" textAnchor="middle" className="cn-lesson-angle">
            60°
          </text>
        </svg>
        <figcaption>A–B와 B–C는 60°, A–C는 120° 차이가 난다.</figcaption>
      </figure>
      <p>
        국소적인 숨은 변수로 설명한다면, 입자는 각 방향의 질문에 어떤 답을 할지
        미리 정해 놓았다고 생각할 수 있다. 예를 들면 이런 답안이 가능하다.
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>가능한 사전 답안의 한 예</caption>
          <thead>
            <tr>
              <th scope="col">측정 방향</th>
              <th scope="col">앨리스 입자</th>
              <th scope="col">밥 입자</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A (0°)</th>
              <td>+1</td>
              <td>−1</td>
            </tr>
            <tr>
              <th scope="row">B (60°)</th>
              <td>+1</td>
              <td>−1</td>
            </tr>
            <tr>
              <th scope="row">C (120°)</th>
              <td>−1</td>
              <td>+1</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        같은 방향을 물으면 항상 반대여야 하니 밥의 답은 앨리스와 반대다. 다른
        답안도 얼마든지 가능하지만, 어느 경우든 세 질문에 대한 답이 하나의
        일관된 표를 이뤄야 한다.
      </p>

      <h4>이 답안표에는 피할 수 없는 제약이 있다</h4>
      <p>
        우선 앨리스의 답만 보자. A와 C의 답이 다르다면, 다음 둘 중 적어도 하나는
        반드시 성립해야 한다.
      </p>
      <ul>
        <li>A와 B의 답이 다르다.</li>
        <li>B와 C의 답이 다르다.</li>
      </ul>
      <p>
        A와 B가 같고 B와 C도 같다면, A와 C도 같을 수밖에 없기 때문이다. 위의
        표에서도 A와 C가 다른데, 그 사이의 B는 A와 같고 C와는 다르다.
      </p>
      <p>
        그런 답안들을 많이 모아도 마찬가지다. A와 C가 다른 경우는 반드시 나머지
        두 경우 중 하나에 포함되므로, 그 확률은 두 확률의 합을 넘을 수 없다.
      </p>
      <Equation name="bell-answers" />
      <p>
        이 식의 A, B, C는 앨리스가 각 방향에 미리 정한 답이다. 실제로 한 입자를
        세 방향으로 한꺼번에 측정한다는 뜻은 아니다.
      </p>
      <p>그렇다면 이 관계를 두 입자의 실험에서 어떻게 확인할까?</p>
      <p>
        위 표에서 앨리스의 A는 +1, C는 −1이다. 그런데 밥의 C는 +1이다. 그래서
        ‘앨리스의 A와 C가 다르다’는 것은 ‘앨리스에게 A를, 밥에게 C를 물으면 두
        답이 같다’는 말로 바꿀 수 있다.
      </p>
      <p>
        같은 방향에서 두 사람의 답이 반대라는 조건을 다른 쌍에도 적용하면, 실제
        측정 기록을 비교하는 부등식이 된다.
      </p>
      <Equation name="bell-bound" />
      <p>
        P의 ‘같음’은 두 사람이 같은 결과를 얻을 확률이다. 매번 새 입자쌍으로
        실험하고, 어떤 방향을 고를지는 입자의 숨은 정보와 독립적으로 정한다고
        가정한다. 이 조건에서 사전 답안 모형은 위 관계를 반드시 지켜야 한다.
      </p>

      <h4>그런데 양자역학은 이 한계를 넘어선다</h4>
      <p>
        앞에서 준비한 단일항 상태 |Ψ⁻⟩를 양자역학으로 계산해 보자. 두 측정 방향
        사이의 각도를 θ라고 하면, 이 상태에서 결과가 같을 확률은 다음과 같다.
      </p>
      <Equation name="bell-quantum" />
      <p>앞의 세 방향을 넣어 보면 다음과 같다.</p>
      <div className="cn-table-wrap">
        <table>
          <caption>양자역학이 예측하는 확률</caption>
          <thead>
            <tr>
              <th scope="col">측정 방향</th>
              <th scope="col">각도 차이</th>
              <th scope="col">결과가 같을 확률</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A · B</th>
              <td>60°</td>
              <td>25%</td>
            </tr>
            <tr>
              <th scope="row">B · C</th>
              <td>60°</td>
              <td>25%</td>
            </tr>
            <tr>
              <th scope="row">A · C</th>
              <td>120°</td>
              <td>75%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>이 숫자들이 앞의 부등식을 만족하려면 아래 관계가 성립해야 한다.</p>
      <div className="cn-lesson-result">
        <Equation name="bell-substitution" />
        <p>
          <strong>
            하지만 0.75는 0.50보다 크다. 이 관계는 성립하지 않는다.
          </strong>
        </p>
      </div>
      <p>
        이것이 벨 부등식 위반의 핵심이다. 사전 답안표를 어떻게 만들고 어떤
        비율로 섞어도 이 세 확률을 함께 만들어 낼 수는 없다. 그런데 양자역학은
        이런 상관관계가 가능하다고 예측하는 것이다.
      </p>

      <h4>그래서 자연에 대해 무엇을 알게 된 걸까?</h4>
      <p>
        부등식이 위반됐다고 해서 곧바로 ‘측정 전에는 아무것도 정해져 있지
        않다’고 결론 내릴 수는 없다. 정확히는 다음 조건들을 모두 지키는 설명으로
        관측된 상관관계를 재현할 수 없다는 것이다.
      </p>
      <ul>
        <li>
          <strong>국소적 인과성.</strong> 각 장소의 측정 결과와 두 결과의 관계를
          그곳의 원인과 공통의 과거에 있던 정보로 설명한다.
        </li>
        <li>
          <strong>측정 선택의 독립성.</strong> 어떤 방향으로 측정할지의 선택은
          입자에 주어진 숨은 변수와 통계적으로 독립이다.
        </li>
        <li>측정에 기록 가능한 결과가 있고, 통상적인 확률 규칙을 적용한다.</li>
      </ul>
      <p>
        어느 조건을 유지하고 어느 조건을 바꿀지는 별개의 문제다. 비국소적인
        결정론적 해석도 있고, 부등식의 위반이 빛보다 빠른 통신을 가능하게 해주는
        것도 아니다.
      </p>
      <p>
        흥미로운 것은 ‘우리가 아직 답을 모를 뿐’이라는 설명에도 실험으로 확인할
        수 있는 한계가 생겼다는 점이다. 숨은 정보가 있다는 생각 자체보다,{" "}
        <strong>
          그 정보가 국소적으로 작동하면서 모든 양자 상관관계를 설명할 수 있느냐
        </strong>
        가 문제인 것이다.
      </p>
    </div>
  );
}

function Chsh() {
  const [answers, setAnswers] = useState([0, 0, 0, 0]);
  const { wins, probability } = chsh(answers);
  const pairs = ["A₀·B₀", "A₀·B₁", "A₁·B₀", "A₁·B₁"];
  const links = [
    { x1: 142, y1: 60, x2: 378, y2: 60 },
    { x1: 142, y1: 60, x2: 378, y2: 200 },
    { x1: 142, y1: 200, x2: 378, y2: 60 },
    { x1: 142, y1: 200, x2: 378, y2: 200 },
  ];
  return (
    <div className="cn-lesson">
      <p>
        이름은 1969년 논문의 네 저자, Clauser·Horne·Shimony·Holt에서 따왔다.
      </p>

      <h4>벨의 부등식에서 CHSH로</h4>
      <p>
        앞의 벨 예시는 같은 방향에서 결과가 완벽하게 반대라는 조건을 이용했다.
        1969년에 나온 CHSH 부등식은 이 조건 없이도 검증할 수 있도록 벨의 논의를
        확장했다.
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">비교</th>
              <th scope="col">앞의 벨 부등식 예시</th>
              <th scope="col">CHSH 부등식</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">측정 선택</th>
              <td>세 방향 A, B, C</td>
              <td>각 관측자에게 두 방향</td>
            </tr>
            <tr>
              <th scope="row">같은 방향의 결과</th>
              <td>항상 반대라고 가정</td>
              <td>그 조건이 없어도 적용</td>
            </tr>
            <tr>
              <th scope="row">검증하는 것</th>
              <td colSpan={2}>
                국소적 숨은 변수로 설명할 수 있는 상관관계의 한계
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        CHSH는 별개의 현상이 아니라 같은 문제를 더 널리 실험할 수 있게 만든
        형태다. 실제 실험에서도 이런 국소적 모형의 한계를 넘는 결과가 관측됐다.
      </p>

      <p>왜 이런 한계가 생기는지, 아주 간단한 게임으로 살펴보자.</p>

      <h4>두 사람에게 질문하는 게임</h4>
      <p>
        앨리스와 밥이라는 두 사람이 있다고 가정해보자. 둘은 멀리 떨어져 있어서
        게임 도중에는 서로 소통할 수 없다. 대신 시작 전에는 얼마든지 작전을 짤
        수 있다.
      </p>
      <p>각자는 무작위로 두 질문 중 하나를 받는다.</p>
      <ul>
        <li>앨리스에게는 A₀ 또는 A₁</li>
        <li>밥에게는 B₀ 또는 B₁</li>
      </ul>
      <p>
        질문을 받으면 <strong>0 또는 1로 답해야 한다.</strong> 각자는 자기
        질문만 알고, 상대가 무슨 질문을 받았는지는 모른다.
      </p>
      <p>이기는 규칙은 다음과 같다.</p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">앨리스 질문</th>
              <th scope="col">밥 질문</th>
              <th scope="col">승리 조건</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A₀</td>
              <td>B₀</td>
              <td>두 답이 같아야 함</td>
            </tr>
            <tr>
              <td>A₀</td>
              <td>B₁</td>
              <td>두 답이 같아야 함</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₀</td>
              <td>두 답이 같아야 함</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₁</td>
              <td>두 답이 달라야 함</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        네 질문 조합은 같은 확률로 나오고, 질문 선택은 둘이 미리 공유한 정보와
        독립적이다.
      </p>
      <p>
        여기서 재미있는 문제가 생긴다.{" "}
        <strong>
          미리 어떤 답을 정해 놓아도 네 조건을 모두 만족시킬 수는 없다.
        </strong>
      </p>

      <h4>왜 최대 75%밖에 이길 수 없을까?</h4>
      <p>첫 번째 조건을 맞추려면 A₀의 답과 B₀의 답이 같아야 한다.</p>
      <p>
        두 번째 조건은 A₀와 B₁이 같아야 하고, 세 번째 조건은 A₁과 B₀가 같아야
        한다.
      </p>
      <p>
        아래 그림에서 실선 세 개를 따라가보자. 결국{" "}
        <strong>네 질문의 답이 모두 같아야 한다.</strong> 그런데 마지막 점선은
        A₁과 B₁의 답이 달라야 한다고 요구한다. 두 요구를 한꺼번에 맞출 수 없는
        것이다.
      </p>
      <figure className="cn-lesson-figure">
        <div
          className="cn-game-diagram"
          role="group"
          aria-label="CHSH의 네 질문에 미리 정할 답"
          aria-describedby="chsh-task"
        >
          <svg viewBox="0 0 520 260" aria-hidden="true">
            {links.map((link, i) => (
              <line
                key={pairs[i]}
                {...link}
                className={`cn-game-line${wins[i] ? "" : " cn-game-line-failed"}`}
                strokeDasharray={i === 3 ? "8 6" : undefined}
              />
            ))}
          </svg>
          {["A₀", "A₁", "B₀", "B₁"].map((name, i) => (
            <button
              className="cn-game-node"
              type="button"
              key={name}
              style={{
                left: i < 2 ? "17.3077%" : "82.6923%",
                top: i % 2 === 0 ? "23.0769%" : "76.9231%",
              }}
              aria-label={`${i < 2 ? "앨리스" : "밥"}의 ${name} 답 ${answers[i]}, 눌러 전환`}
              aria-pressed={answers[i] === 1}
              onClick={() =>
                setAnswers((current) =>
                  current.map((v, j) => (i === j ? 1 - v : v))
                )
              }
            >
              <span>{name}</span>
              <small>답 {answers[i]}</small>
            </button>
          ))}
        </div>
        <figcaption>
          실선: 같은 답이어야 함 · 점선: 다른 답이어야 함<br />
          진한 선은 지금 답안에서 실패하는 조합이다.
        </figcaption>
      </figure>
      <p className="cn-task" id="chsh-task">
        네 칸을 누르면 답이 0과 1 사이에서 바뀐다. 먼저 ‘A₁만 1’을 눌러보자.
        마지막 조건을 고치면 실패가 어디로 옮겨 갈까? 다른 답도 바꾸면서 네 선을
        모두 만족시킬 수 있는지 확인해보자.
      </p>
      <div className="cn-controls" role="group" aria-label="CHSH 답안 예시">
        <button type="button" onClick={() => setAnswers([0, 0, 0, 0])}>
          모두 0
        </button>
        <button type="button" onClick={() => setAnswers([0, 1, 0, 0])}>
          A₁만 1
        </button>
      </div>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          네 조건 중 {wins.filter(Boolean).length}개 성공 · 승률{" "}
          {probability * 100}%
        </strong>
        <span className="cn-observation">
          실패하는 조합: {pairs.filter((_, i) => !wins[i]).join(", ")}
        </span>
      </div>
      <p>
        실제 게임에서는 네 질문 조합 중 하나만 나온다. 위 그림은 같은 답안을 네
        경우에 모두 적용해 본 것이다.
      </p>
      <p>
        어떤 답안을 골라도 적어도 한 조건에서는 실패한다. 네 조합이 같은 확률로
        나온다면, 가장 잘해도 3/4, 즉 <strong>75%</strong>를 이길 수 있다는
        뜻이다.
      </p>
      <p>
        매번 다른 답안을 쓰거나 미리 난수를 공유해도 마찬가지다. 어느 답안도
        75%를 넘지 못하니, 그 답안들을 섞은 평균도 75%를 넘을 수 없다.
      </p>

      <h4>그런데 양자역학에서는 약 85.4%가 가능하다</h4>
      <p>
        이번에는 둘이 사전 답안 대신 얽힌 입자를 하나씩 가지고 있다고 생각해
        보자.
      </p>
      <p>
        각자는 받은 질문에 따라 자기 입자를 어느 방향으로 측정할지 정하고, 나온
        결과로 답한다. 이 게임의 ‘질문’은 측정 방향이고 ‘답’은 측정 결과인
        셈이다.
      </p>
      <p>
        그렇다면 약 85.4%라는 숫자는 어디서 나오는 걸까? 얽힌 상태에도 여러
        종류가 있다. 앞의 벨 예시에서는 같은 방향에서 반대 결과가 나오는 |Ψ⁻⟩를
        썼지만, 이 게임에서는 아래의 |Φ⁺⟩ 상태를 준비한다.
      </p>
      <Equation name="chsh-state" />
      <p>
        이후의 측정축은 모두 X–Z 평면 안에서 고른다. |Φ⁺⟩는 이 평면에서 같은
        방향으로 측정하면 같은 결과가 나오는 상태다. 두 측정축 사이의 각도를
        θ라고 하면, 이 상태에서의 확률은 다음과 같다.
      </p>
      <Equation name="chsh-probabilities" />
      <p>
        앞의 sin²(θ/2)와 여기의 cos²(θ/2)가 다른 이유는 준비한 얽힘 상태가
        다르기 때문이다. 같은 방향인 θ = 0°에서 앞의 상태는 결과가 항상 다르고,
        이번 상태는 위 평면에서 항상 같다.
      </p>
      <p>
        이제 Z축을 0°로 두고, 앨리스의 측정축은 A₀에서 0°, A₁에서 90°로 정하자.
        밥은 B₀에서 45°, B₁에서 −45°로 정해보자. 앞의 세 조합은 측정축이 45°
        차이이고, 마지막 조합만 135° 차이가 난다.
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>스핀 측정축의 각도와 각 조합의 승리 조건</caption>
          <thead>
            <tr>
              <th scope="col">질문 조합</th>
              <th scope="col">각도 차이</th>
              <th scope="col">승리 조건</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A₀ · B₀</th>
              <td>45°</td>
              <td>같은 답</td>
            </tr>
            <tr>
              <th scope="row">A₀ · B₁</th>
              <td>45°</td>
              <td>같은 답</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₀</th>
              <td>45°</td>
              <td>같은 답</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₁</th>
              <td>135°</td>
              <td>다른 답</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        앞의 세 조합은 같은 답이어야 하므로, 첫 번째 확률 식에 45°를 넣으면
        된다. 삼각함수의 반각 공식을 이용해 정리하면 다음과 같다.
      </p>
      <Equation name="chsh-same" />
      <p>
        마지막 조합은 다른 답이어야 하므로, 두 번째 식에 135°를 넣는다. 67.5°와
        22.5°의 합은 90°이므로 이 확률도 앞과 같아진다.
      </p>
      <Equation name="chsh-different" />
      <p>
        결국 <strong>네 조합 모두 약 85.4%의 확률로 승리한다.</strong> 네 조합이
        각각 1/4의 확률로 선택되므로, 전체 승률도 이 네 확률의 평균인 약 85.4%가
        되는 것이다.
      </p>
      <div
        className="cn-bars"
        role="img"
        aria-label="최대 승률 비교: 고전적인 국소 전략 75%, 얽힘을 쓰는 양자 전략 약 85.4%"
      >
        <div>
          <span>고전적인 국소 전략</span>
          <b>75.0%</b>
          <i style={{ width: "75%" }} />
        </div>
        <div>
          <span>얽힘을 쓰는 양자 전략</span>
          <b>85.4%</b>
          <i style={{ width: `${(0.5 + Math.SQRT2 / 4) * 100}%` }} />
        </div>
      </div>
      <p>그렇다면 앞의 논리가 틀린 걸까?</p>
      <p>
        그렇지는 않다. 앞에서는 묻지 않은 질문의 답까지 하나의 표에 미리 써 놓을
        수 있다고 가정했다. 양자 측정으로 얻는 통계는 그런 국소적 답안표들을
        아무리 섞어도 재현할 수 없다는 것이다.
      </p>
      <p>
        위에서 조작한 그림은 사전 답안의 한계를 보여준다. 85.4%는 그 그림에서 더
        좋은 답안을 찾아 얻은 수가 아니라, 양자역학의 측정 규칙으로 계산한
        값이다.
      </p>

      <h4>이 게임을 수식으로 쓰면 CHSH 부등식이 된다</h4>
      <p>
        측정 결과를 0과 1 대신 +1과 −1로 표시해 보자. 두 결과를 곱한 평균을
        E라고 하면, 같은 답이 자주 나올수록 E는 +1에 가까워지고 반대 답이 자주
        나올수록 −1에 가까워진다.
      </p>
      <p>
        아래 첨자는 질문 조합이다. 앞의 세 조합은 같은 답이어야 하니 더하고,
        마지막 조합은 반대 답이어야 하니 빼는 것이다.
      </p>
      <Equation name="chsh" />
      <p>
        국소적 숨은 변수 모형에서는 S가 2를 넘지 못한다. 하지만 양자역학에서는
        다음 값까지 가능하다.
      </p>
      <Equation name="quantum" />
      <p>
        이 상한을 ‘치렐손 경계’라고 부른다. 게임에서 얻을 수 있는{" "}
        <strong>최대 승률</strong>과도 연결된다.
      </p>
      <Equation name="winning" />
      <p>
        국소적 전략의 상한 2를 넣으면 75%, 양자 전략의 상한 2√2를 넣으면 약
        85.4%가 나온다. 앞에서 본 게임과 부등식이 같은 한계를 다른 방식으로
        나타내는 것이다.
      </p>

      <h4>이 게임이 자연에 대해 알려주는 것</h4>
      <p>
        두 입자가 미리 가진 국소적인 정보만으로 답하고, 측정 선택이 그 정보와
        독립적이라면 넘을 수 없는 한계가 있다. 실제 실험에서는 그 한계를 넘는
        상관관계가 관측됐다.
      </p>
      <p>
        그렇다고 빛보다 빠른 통신이 가능해지거나 모든 결정론이 틀렸다는 뜻은
        아니다. 어떤 전제들을 함께 유지할 수 있는지를 따져야 한다.
      </p>
      <p>
        CHSH의 흥미로운 점은 여기에 있다.{" "}
        <strong>
          ‘서로 미리 답을 맞춰 놓았을 뿐’이라는 설명이 어디까지 통하는지를
          숫자로 시험할 수 있게 만든 것.
        </strong>{" "}
        그리고 자연은 그 설명이 허용하는 한계를 넘어서는 것이다.
      </p>
    </div>
  );
}

function Guiding() {
  const [waveNumber, setWaveNumber] = useState(1);
  const [phaseOffset, setPhaseOffset] = useState(0);
  const phaseY = (x: number, offset = phaseOffset) =>
    150 - 34 * (waveNumber * x + offset);

  return (
    <div className="cn-lesson">
      <p>이 이론이 흥미로운 것은 다음 세 가지를 함께 주장하기 때문이다.</p>
      <ul>
        <li>입자는 측정하기 전에도 실제 위치를 가지고 있다.</li>
        <li>입자의 운동은 근본적으로 결정론적이다.</li>
        <li>
          그런데도 양자 평형에서는 일반적인 양자역학과 같은 실험 결과를 예측할
          수 있다.
        </li>
      </ul>
      <p>
        앞서 살펴본 벨의 부등식을 떠올리면 모순처럼 느껴지지 않을까? 하지만 벨의
        정리가 배제하는 것은 모든 결정론이 아니라, 양자역학의 상관관계를 국소적
        숨은 변수만으로 설명할 수 있다는 생각이다. 봄 이론은 비국소성을
        명시적으로 받아들이기 때문에 이 결과와 모순되지 않는다.
      </p>
      <p>
        이 접근은 드브로이가 1927년에 제안했고, 봄이 1952년에 독립적으로 다시
        발견해 체계화했다. 그렇다면 입자의 움직임을 어떻게 정하고, 결정론적인
        운동에서 어떻게 양자역학의 확률이 나타나는지 살펴보자. 앞의 세 번째
        주장에 붙은 ‘양자 평형’이라는 조건도 그 과정에서 다시 보게 될 것이다.
      </p>

      <h4>파동함수에 입자의 실제 위치를 더한다</h4>
      <p>
        보통 양자역학에서는 입자의 상태를 파동함수 ψ로 표현한다. 이 파동함수를
        이용해 각 위치에서 입자를 발견할 확률을 계산한다.
      </p>
      <p>
        드브로이–봄 이론은 여기에 <strong>입자의 실제 위치 Q(t)</strong>를
        추가한다. 입자는 측정할 때에만 어떤 위치에서 발견되는 것이 아니라,
        측정하기 전에도 실제로 어디엔가 있다고 보는 것이다.
      </p>
      <p>
        이제 파동함수와 입자의 위치를 구분해서 생각해보자. 파동함수는 슈뢰딩거
        방정식에 따라 변한다. 입자의 위치는 그 파동함수에서 계산한 속도에 따라
        변한다. 이 두 번째 규칙이 유도 방정식이다.
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">요소</th>
              <th scope="col">역할</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">파동함수 ψ</th>
              <td>입자가 어떻게 움직일지 정하는 정보를 담는다.</td>
            </tr>
            <tr>
              <th scope="row">실제 위치 Q(t)</th>
              <td>시간 t에 입자가 실제로 어디 있는지 나타낸다.</td>
            </tr>
            <tr>
              <th scope="row">유도 방정식</th>
              <td>파동함수와 실제 위치로 그 순간의 속도를 계산한다.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        핵심은 파동함수가 입자를 발견할 확률을 계산하는 데에만 쓰이는 것이
        아니라, 실제 입자의 운동까지 정한다는 점이다. 다만 입자를 밀어내는
        물결처럼 생각하면 부정확하다. 파동함수는 위치마다 복소수 값을 부여하는
        수학적 대상이다.
      </p>

      <h4>유도 방정식은 무엇을 계산할까?</h4>
      <p>
        우선 스핀이 없는 입자 하나를 생각해보자. 여기서는 상대론적 효과와
        자기장은 제외한다. 이 경우의 유도 방정식은 다음과 같다.
      </p>
      <Equation name="guiding" />
      <p>
        기호가 많아 복잡해 보일 수 있다. 우선 식이 무엇을 구하는지부터 보자.
        왼쪽의 dQ/dt는 입자의 속도다. 오른쪽은 그 속도를 파동함수와 현재 위치로
        계산하는 방법이다. 각 기호의 뜻을 나누면 다음과 같다.
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">기호</th>
              <th scope="col">의미</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Q(t)</th>
              <td>시간 t에서 입자의 실제 위치</td>
            </tr>
            <tr>
              <th scope="row">dQ/dt</th>
              <td>입자의 위치가 시간에 따라 변하는 속도</td>
            </tr>
            <tr>
              <th scope="row">ψ</th>
              <td>파동함수</td>
            </tr>
            <tr>
              <th scope="row">∇ψ</th>
              <td>위치에 따라 파동함수가 어떻게 변하는지 나타내는 공간 미분</td>
            </tr>
            <tr>
              <th scope="row">Im</th>
              <td>복소수에서 허수 부분을 취하는 연산</td>
            </tr>
            <tr>
              <th scope="row">ℏ</th>
              <td>플랑크 상수 h를 2π로 나눈 값</td>
            </tr>
            <tr>
              <th scope="row">m</th>
              <td>입자의 질량</td>
            </tr>
            <tr>
              <th scope="row">x=Q(t)</th>
              <td>오른쪽의 계산을 실제 입자가 있는 위치에서 한다는 뜻</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        결국 이 식은{" "}
        <strong>
          입자가 지금 있는 곳에서 파동함수를 살펴보고, 그곳의 속도를 계산한다
        </strong>
        는 뜻이다.
      </p>
      <p>
        익숙한 뉴턴역학과 비교해보자. 뉴턴의 운동 방정식에서는 힘으로 가속도를
        구한다.
      </p>
      <Equation name="guiding-newton" />
      <p>
        유도 방정식은 가속도가 아니라 <strong>속도 자체를 직접 정한다.</strong>
        그 속도를 따라 위치가 변하고, 다음 위치에서는 다시 그곳의 파동함수로
        속도를 계산한다. 따라서 초기 위치와 초기 파동함수, 파동함수의 변화
        규칙이 주어지면 이후의 궤적이 결정된다.
      </p>
      <p>
        위 식은 ψ가 0이 아닌 곳에서 쓴다. ψ가 0인 곳에서는 식의 나눗셈을 그대로
        적용할 수 없으므로 별도의 수학적 검토가 필요하다.
      </p>

      <h4>파동함수를 진폭과 위상으로 나눠보자</h4>
      <p>
        그렇다면 파동함수의 어떤 정보가 입자의 속도를 정하는 걸까? 이를 보려면
        파동함수를 두 요소로 나눠보는 것이 좋다.
      </p>
      <p>
        복소수는 평면 위의 점처럼 크기와 각도로 표현할 수 있다. 파동함수에서도
        그 크기를 진폭, 각도를 위상이라고 한다. 이를 식으로 쓰면 다음과 같다.
      </p>
      <Equation name="guiding-phase" />
      <ul>
        <li>R은 파동함수의 진폭이다.</li>
        <li>S는 위상을 나타내는 함수다. 이 표기에서 실제 위상각은 S/ℏ이다.</li>
      </ul>
      <p>
        이제 이 표현을 유도 방정식에 대입해보자. 먼저 오른쪽에 있던 ∇ψ/ψ를
        계산하면 두 항으로 나뉜다.
      </p>
      <Equation name="guiding-ratio" />
      <p>
        유도 방정식은 여기서 허수 부분만 취한다. 앞의 ∇R/R은 실수이므로
        사라지고, 뒤의 항에서 ∇S/ℏ가 남는다. 여기에 식 바깥의 ℏ/m을 곱하면 ℏ가
        약분된다. 그래서 속도 식은 다음처럼 정리된다.
      </p>
      <Equation name="guiding-gradient" />
      <p>
        결국 입자의 속도를 정하는 것은{" "}
        <strong>파동함수의 위상이 공간에서 어떻게 변하는가</strong>이다. ∇S는
        같은 시각에 옆 위치로 옮겨갔을 때 S가 얼마나, 어느 방향으로 변하는지를
        나타낸다. 그 기울기를 질량으로 나눈 값이 현재 위치에서의 속도가 되는
        것이다.
      </p>
      <p>
        여기서 위상이 크다는 것과 위상의 기울기가 크다는 것은 구분해야 한다.
        모든 위치의 위상에 같은 값을 더하면 위상 값은 바뀌지만, 이웃한 위치
        사이의 차이는 그대로다. 따라서 기울기도, 그 순간의 속도도 바뀌지 않는다.
      </p>
      <p>
        한 방향의 간단한 예를 보자. 진폭 A가 일정한 평면파를 아래처럼 쓸 수
        있다. k는 위상이 위치에 따라 변하는 정도이고, ω는 시간에 따라 변하는
        정도다.
      </p>
      <Equation name="guiding-plane" />
      <p>
        앞의 표현과 비교하면 이 파동함수의 S는 ℏ(kx−ωt)다. 이를 x에 대해
        미분하면 ℏk가 남으므로, 속도는 다음과 같다.
      </p>
      <Equation name="guiding-plane-speed" />
      <p>
        이 평면파의 운동량이 p=ℏk이므로, 익숙한 고전역학의 속도와 운동량 관계가
        나오는 것이다. 이제 아래 그림에서 위상의 변화를 직접 비교해보자.
      </p>
      <p className="cn-task" id="guiding-phase-task">
        먼저 기울기를 ‘증가 → 일정 → 감소’로 바꿔보자. 속도의 방향과 크기가
        어떻게 달라질까? 그다음 기울기를 고정하고 전체 위상에 π/2를 더해보자.
        그래프의 높이가 달라져도 속도는 바뀌지 않는다는 것을 확인할 수 있다.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="위상의 공간 기울기"
        aria-describedby="guiding-phase-task"
      >
        {[-1, 0, 1].map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={waveNumber === k}
            onClick={() => setWaveNumber(k)}
          >
            {k === -1 ? "감소 k=−1" : k === 0 ? "일정 k=0" : "증가 k=+1"}
          </button>
        ))}
      </div>
      <div
        className="cn-controls"
        role="group"
        aria-label="모든 위치에 더하는 위상"
      >
        <button
          type="button"
          aria-pressed={phaseOffset === 0}
          onClick={() => setPhaseOffset(0)}
        >
          전체 위상 0
        </button>
        <button
          type="button"
          aria-pressed={phaseOffset !== 0}
          onClick={() => setPhaseOffset(Math.PI / 2)}
        >
          전체 위상 +π/2
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label={`위치 x에 따른 위상 그래프. 기울기 ${waveNumber}, 모든 위치에 더한 위상 ${phaseOffset === 0 ? "0" : "파이 나누기 2"}. 속도는 ${waveNumber}.`}
        >
          <line x1="65" y1="150" x2="475" y2="150" className="cn-axis" />
          <line x1="270" y1="235" x2="270" y2="20" className="cn-axis" />
          {phaseOffset !== 0 && (
            <line
              x1="80"
              y1={phaseY(-2, 0)}
              x2="460"
              y2={phaseY(2, 0)}
              className="cn-guide"
            />
          )}
          <line
            x1="80"
            y1={phaseY(-2)}
            x2="460"
            y2={phaseY(2)}
            className="cn-vector"
          />
          <circle cx="270" cy={phaseY(0)} r="4" className="cn-dot" />
          <text x="80" y="20">
            위상 S/ℏ
          </text>
          <text x="80" y="140" textAnchor="middle">
            −2
          </text>
          <text x="280" y="170">
            0
          </text>
          <text x="460" y="140" textAnchor="middle">
            2
          </text>
          <text x="510" y="170" textAnchor="end">
            위치 x
          </text>
        </svg>
        <figcaption>
          t=0에서 본 평면파의 위상. 단위는 ℏ=m=1로 정했다.
          <br />
          점은 x=0에서의 위상 값이다. 위상을 더하면 점선으로 원래 그래프를 함께
          보여준다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          기울기 k={waveNumber} · 속도 v={waveNumber}
        </strong>
        <span className="cn-observation">
          {waveNumber === 0
            ? "위치에 따라 위상이 변하지 않으므로 속도는 0이다."
            : waveNumber > 0
              ? "위치가 증가할수록 위상도 증가하므로, 입자는 x가 증가하는 방향으로 움직인다."
              : "위치가 증가할수록 위상은 감소하므로, 입자는 x가 감소하는 방향으로 움직인다."}
          {phaseOffset !== 0 &&
            " 전체 위상에 π/2를 더해도 기울기와 속도는 그대로다."}
        </span>
      </div>
      <p>
        그렇다고 진폭 R이 운동과 무관하다는 뜻은 아니다. 진폭과 위상은 슈뢰딩거
        방정식에 따라 함께 변한다. 위상만 속도 식에 직접 남는다는 것과, 진폭이
        이후의 운동에도 아무런 영향을 주지 않는다는 것은 다른 이야기다.
      </p>

      <h4>입자가 한 슬릿만 지나도 간섭무늬가 생길까?</h4>
      <p>
        이중 슬릿에서는 입자와 파동함수의 역할이 더 분명하게 드러난다. 이
        이론에서 입자는 실제 위치를 가지므로 두 슬릿 중 하나를 통과한다. 하지만
        두 슬릿이 열려 있고 어느 쪽을 지났는지 기록하지 않는 실험에서는,
        파동함수가 두 슬릿을 모두 통과한 성분의 중첩으로 변한다.
      </p>
      <p>
        두 성분이 간섭하면 진폭과 위상의 공간적인 모양도 달라진다. 입자는 그렇게
        바뀐 파동함수에서 계산한 속도를 따라 움직인다. 어느 슬릿을
        지났는지만으로 이후의 경로가 정해지는 것이 아니라, 두 슬릿이 만드는
        파동함수 전체가 운동에 관여하는 것이다.
      </p>
      <p>
        여러 번 반복해 도착 위치를 모으면 양자역학의 간섭무늬를 얻을 수 있다.
        다만 정확한 통계를 얻으려면, 시작 위치들의 분포에 대해서도 설명해야
        한다.
      </p>

      <h4>결정론적인데 왜 확률이 나타날까?</h4>
      <p>
        한 입자의 초기 위치가 정해져 있다면 경로도 정해진다. 하지만 실험에서 그
        정확한 위치를 매번 아는 것은 아니다. 그렇다면 시작 위치가 어떻게
        분포하는지도 함께 주어져야, 반복 실험에서 어떤 통계가 나올지 말할 수
        있다.
      </p>
      <p>
        위치의 확률 밀도를 ρ라고 하면, 통상적인 ‘양자 평형’에서는 다음 분포를
        사용한다. ψ의 크기를 제곱해 위치의 확률 밀도를 얻는 보른 규칙이다.
      </p>
      <Equation name="guiding-equilibrium" />
      <p>
        유도 방정식의 중요한 성질은{" "}
        <strong>
          처음에 위치들이 |ψ|²에 따라 분포했다면, 이후에도 변해가는 |ψ|²에 맞춰
          분포한다
        </strong>
        는 점이다. 파동함수의 변화와 입자들의 움직임이 같은 위치 통계를 유지하는
        것이다. 이를 등변성(equivariance)이라고 부른다.
      </p>
      <p>
        이것은 유도 방정식과도 직접 연결된다. 슈뢰딩거 방정식에서 얻는 확률의
        흐름을 j라고 하면, 유도 방정식의 속도는 그 흐름을 밀도 |ψ|²로 나눈
        값이다. ψ*는 ψ의 복소켤레를 뜻한다.
      </p>
      <Equation name="guiding-current" />
      <p>
        입자들이 이 속도로 움직이기 때문에, 위치 분포의 변화가 슈뢰딩거 방정식이
        주는 확률의 변화와 일치한다. 측정 장치까지 포함해 이 관계를 적용하면,
        비상대론적 양자 평형의 범위에서 일반적인 양자역학의 측정 통계를
        재현한다.
      </p>
      <p>
        다만 어떤 초기 분포든 저절로 |ψ|²가 된다는 뜻은 아니다. 왜 양자 평형
        분포를 사용해야 하는지는 별도의 통계적 논의가 필요하다. 결정론적인 운동
        법칙만 적었다고 보른 규칙까지 자동으로 증명되는 것은 아닌 셈이다.
      </p>

      <h4>벨의 부등식과 모순되지 않는 이유</h4>
      <p>
        그런데 앞에서는 국소적인 사전 정보로 양자역학의 상관관계를 설명할 수
        없다고 하지 않았을까? 봄 이론은 결정론을 유지하면서 국소성은 유지하지
        않는다. 이 차이는 입자가 두 개일 때 식에 드러난다.
      </p>
      <p>
        여러 입자의 파동함수는 각 입자의 위치를 함께 입력받는다. 입자 두 개에는
        위치 좌표 여섯 개가 필요하고, 가능한 좌표 조합 전체를 ‘구성 공간’이라고
        부른다. 이 공동 파동함수로 첫 번째 입자의 속도를 계산해보자.
      </p>
      <Equation name="guiding-pair" />
      <p>
        Ψ는 두 입자의 위치를 함께 입력받는 공동 파동함수이고, ∇₁은 첫 번째
        입자의 위치에 대해 공간적인 변화를 구한다는 뜻이다. 첫 번째 입자의
        속도를 계산하는 곳에{" "}
        <strong>두 번째 입자의 실제 위치 Q₂도 들어간다.</strong>
      </p>
      <p>
        파동함수가 각 입자의 함수로 분리된다면 상대 위치에 대한 의존성이
        사라지지만, 얽힌 상태에서는 일반적으로 그렇게 분리할 수 없다. 멀리
        떨어진 입자의 위치나 그곳의 측정 장치가 이쪽 운동에 관여할 수 있는
        것이다. 이것이 이 이론의 비국소성이다.
      </p>
      <p>
        여기서 쓴 식은 스핀이 없는 경우다. CHSH처럼 스핀을 다루려면 파동함수를
        여러 복소수 성분을 가진 스피너로 확장한다. 이 이론은 입자의 실제 위치를
        기본 변수로 삼지만, 모든 방향의 스핀 결과를 장치와 무관한 사전 답안으로
        정해두지는 않는다. 측정 결과는 입자와 장치를 포함한 전체의 상호작용에
        따라 결정된다.
      </p>
      <p>
        또한 양자 평형에서는 이 비국소적 의존성으로 원하는 초광속 메시지를 보낼
        수 없다. 운동 법칙이 멀리 있는 변수에 의존한다는 것과, 그 의존성을 통신
        수단으로 제어할 수 있다는 것은 구별해야 한다.
      </p>

      <h4>양자 퍼텐셜은 무엇일까?</h4>
      <p>
        봄은 같은 운동을 ‘양자 퍼텐셜’로도 표현했다. 파동함수를 진폭과 위상으로
        나눠 슈뢰딩거 방정식에 넣으면, S의 변화에 대한 식에 아래 항이 나타난다.
        ∇²R은 진폭의 공간적인 굽음을 나타내는 이차 미분이다.
      </p>
      <Equation name="guiding-potential" />
      <p>
        고전역학에서 운동을 에너지와 S의 변화로 적는 해밀턴–야코비 방정식에 이
        항을 더한 형태로 정리할 수 있다. 이는 앞의 두 운동 방정식을 다시 표현한
        것이며, 별도의 독립적인 힘이나 장을 새로 가정해야 한다는 뜻은 아니다.
        입자의 움직임을 이해하는 데에는 파동함수의 변화와 유도 방정식만으로도
        충분하다.
      </p>

      <h4>그렇다면 이 이론이 옳다고 밝혀진 걸까?</h4>
      <p>
        여기까지의 설명이 실제 우주의 운동 방식을 확정해주는 것은 아니다.
        비상대론적 양자 평형에서 일반적인 양자역학과 같은 실험 결과를 낸다는
        것은, 그 결과만으로 두 설명을 구별하기 어렵다는 뜻이기도 하다.
        상대성이론과 결합하는 확장에도 추가적인 어려움이 있다.
      </p>
      <p>
        이 접근이 보여주는 것은 양자역학의 확률적인 관측 결과와 결정론적인 운동
        법칙이 반드시 모순되지는 않는다는 점이다. 다만 그 운동을 각 입자 주변의
        원인만으로 설명하는 대신, 비국소적인 의존성을 명시적으로 받아들인다.
        결정론을 유지할 수 있다는 것과 국소성까지 함께 유지할 수 있다는 것은
        같은 주장이 아닌 것이다.
      </p>
    </div>
  );
}

function Hilbert() {
  const [angle, setAngle] = useState(30);
  const [measurementBasis, setMeasurementBasis] = useState<"z" | "x">("z");
  const a = Math.cos((angle * Math.PI) / 180);
  const b = Math.sin((angle * Math.PI) / 180);
  const isZ = measurementBasis === "z";

  return (
    <div className="cn-lesson">
      <p>
        특히 앞서 이야기한 드브로이–봄 이론, 파동함수, 벨의 부등식은 모두
        힐베르트 공간이라는 수학적 구조를 사용해 설명할 수 있다.
      </p>
      <p>핵심부터 이야기하면 다음과 같다.</p>
      <ul>
        <li>힐베르트 공간: 양자 상태를 벡터로 표현할 수 있는 수학적 공간</li>
        <li>기저 벡터: 그 공간에서 임의의 상태를 표현하기 위한 기준 벡터</li>
        <li>
          파동함수: 양자 상태 벡터를 특정 기저로 표현했을 때 얻는 수학적 표현 중
          하나
        </li>
      </ul>
      <p>하나씩 살펴보자.</p>

      <h4>먼저 기저 벡터부터 이해해보자</h4>
      <p>우리가 익숙한 2차원 좌표평면을 생각해보자.</p>
      <p>
        2차원에서는 보통 다음 두 기저 벡터를 사용한다. 가로로 한 단위인 e₁과
        세로로 한 단위인 e₂다.
      </p>
      <Equation name="hilbert-classical-basis" />
      <p>
        이 두 벡터만 있으면 어떤 2차원 벡터든 표현할 수 있다. 예를 들어 (5,
        4)라는 벡터는 다음과 같이 쓸 수 있다.
      </p>
      <Equation name="hilbert-classical-vector" />
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 260"
          role="img"
          aria-label="가로 기저 e1의 5배와 세로 기저 e2의 4배를 더해 벡터 (5,4)를 표현하는 좌표평면"
        >
          <defs>
            <marker
              id="hilbert-classical-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {[1, 2, 3, 4, 5].map((n) => (
            <line
              key={`x${n}`}
              x1={120 + 32 * n}
              y1="82"
              x2={120 + 32 * n}
              y2="210"
              stroke="#e4e4e7"
            />
          ))}
          {[1, 2, 3, 4].map((n) => (
            <line
              key={`y${n}`}
              x1="120"
              y1={210 - 32 * n}
              x2="280"
              y2={210 - 32 * n}
              stroke="#e4e4e7"
            />
          ))}
          <line x1="100" y1="210" x2="425" y2="210" className="cn-axis" />
          <line x1="120" y1="225" x2="120" y2="35" className="cn-axis" />
          <line x1="280" y1="82" x2="280" y2="210" className="cn-guide" />
          <line x1="120" y1="82" x2="280" y2="82" className="cn-guide" />
          <g markerEnd="url(#hilbert-classical-arrow)" className="cn-vector">
            <line x1="120" y1="210" x2="152" y2="210" />
            <line x1="120" y1="210" x2="120" y2="178" />
            <line x1="120" y1="210" x2="280" y2="82" />
          </g>
          <text x="293" y="77">
            v = (5, 4)
          </text>
          <text x="146" y="236">
            e₁
          </text>
          <text x="87" y="178">
            e₂
          </text>
          <text x="274" y="234">
            5
          </text>
          <text x="100" y="87">
            4
          </text>
          <text x="435" y="215">
            x
          </text>
          <text x="116" y="26">
            y
          </text>
        </svg>
        <figcaption>
          벡터는 하나지만, 두 기저를 얼마씩 쓰는지로 표현할 수 있다.
        </figcaption>
      </figure>
      <p>
        즉, 기저는 공간 안의 모든 벡터를 조합해서 표현할 수 있도록 선택한
        독립적인 벡터들의 집합이다. 여기서 독립적이라는 것은 어느 하나를 다른
        기저 벡터들의 조합으로 대신할 수 없다는 뜻이다.
      </p>
      <p>
        기저 벡터가 반드시 수평과 수직일 필요는 없다. 서로 평행하지 않은 두
        벡터를 선택해도 2차원 공간을 표현할 수 있다. 다만 서로 직각이고 길이가
        1인 벡터를 고르면 계산이 편리하다. 이런 기저를 정규 직교 기저라고 한다.
      </p>

      <h4>힐베르트 공간은 무엇이 다를까?</h4>
      <p>이제 이 개념을 양자역학으로 확장해보자.</p>
      <p>
        앞의 좌표평면에서는 실수 계수로 벡터를 표현했지만, 양자역학에서는 복소수
        계수도 사용할 수 있어야 한다. 또한 벡터끼리 얼마나 겹치는지 계산하는
        내적(Inner Product)이 정의되어 있어야 한다.
      </p>
      <p>
        수학적으로 힐베르트 공간은 내적이 정의되어 있고 완비성을 만족하는 벡터
        공간이다. 양자역학에서는 보통 복소 힐베르트 공간을 사용한다.
      </p>
      <p>
        완비성은 간단히 말해, 벡터들을 차례로 나열했을 때 뒤로 갈수록 서로
        한없이 가까워진다면, 그 벡터들이 다가가는 극한도 같은 공간 안에
        존재한다는 성질이다.
      </p>
      <p>어려운 정의처럼 느껴지지만, 지금은 다음처럼 이해해도 충분하다.</p>
      <blockquote>
        <p>
          힐베르트 공간은 양자 상태를 벡터로 표현하고, 벡터를 더하거나 내적을
          계산할 수 있도록 만든 수학적 공간이다.
        </p>
      </blockquote>
      <p>
        중요한 것은 이 공간이 반드시 우리가 사는 3차원 물리적 공간을 뜻하지는
        않는다는 점이다. 가령 전자의 스핀 상태만 표현한다면 2차원 복소 힐베르트
        공간을 사용할 수 있다.
      </p>

      <h4>전자 하나의 스핀으로 이해해보자</h4>
      <p>
        전자의 스핀을 특정 축을 따라 측정하면 결과는 두 가지로 나온다. 이 축을
        Z축이라고 하고, 위쪽에 대응하는 상태를 |0⟩, 아래쪽에 대응하는 상태를
        |1⟩로 적어보자. | ⟩는 상태 벡터를 적는 표기다.
      </p>
      <p>이를 벡터로 쓰면 다음과 같다.</p>
      <Equation name="hilbert-spin-basis" />
      <p>
        여기서 |0⟩과 |1⟩을 기저 상태(Basis States)라고 부른다. 앞의 좌표평면과
        벡터의 모양은 같지만, 이번에는 두 스핀 상태를 표현하는 기준이다.
      </p>
      <p>그렇다면 전자는 이 둘 중 한 상태에만 있어야 할까?</p>
      <p>그렇지 않다. 양자역학에서는 두 상태의 중첩이 가능하다.</p>
      <Equation name="hilbert" />
      <p>
        여기서 α와 β는 복소수 계수다. 각 기저 벡터를 얼마씩 조합하는지 나타낸다.
      </p>
      <p>
        정규화된 상태라면 다음 조건을 만족해야 한다. 두 결과가 나올 확률을 모두
        더하면 1이 되도록 상태 벡터의 길이를 맞춘 것이다.
      </p>
      <Equation name="hilbert-normalization" />
      <p>예를 들어 다음 상태를 생각해보자.</p>
      <Equation name="hilbert-example" />
      <p>
        이 상태를 Z축을 따라 측정하면 위쪽 |0⟩은 75%, 아래쪽 |1⟩은 25%의 확률로
        나온다. 각 계수의 절댓값을 제곱하면 이 확률을 얻는다.
      </p>
      <Equation name="hilbert-born" />
      <p>
        이것이 보른 규칙(Born Rule)이다. 여기서 핵심은 α와 β가 확률 자체가
        아니라 확률진폭(Probability Amplitude)이라는 점이다. 확률은 각 계수의
        절댓값을 제곱해서 얻는다.
      </p>
      <p>
        이 차이를 그림에서도 확인해보자. 아래에서는 두 계수가 0 이상의 실수인
        경우를 다룬다.
      </p>
      <p className="cn-task" id="hilbert-state-task">
        ‘75:25’와 ‘50:50’을 차례로 선택해보자. 기준축은 고정되고 상태 벡터가
        바뀐다. 50:50에서는 계수가 각각 약 0.707인데, 확률은 각각 0.5다.
        점선으로 읽은 계수와 그 제곱인 확률을 비교해보자.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="상태 벡터 조합 예시"
        aria-describedby="hilbert-state-task"
      >
        {[0, 30, 45, 90].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={angle === value}
            onClick={() => setAngle(value)}
          >
            {value === 0
              ? "0만 나옴"
              : value === 30
                ? "75:25"
                : value === 45
                  ? "50:50"
                  : "1만 나옴"}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        계수 평면에서 상태 벡터의 각도 <output>{angle}°</output>
        <input
          aria-label="상태 벡터 계수 조합의 각도"
          aria-describedby="hilbert-state-task"
          type="range"
          min="0"
          max="90"
          value={angle}
          onChange={(e) => setAngle(+e.target.value)}
        />
      </label>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label={`고정된 두 기저에 대한 상태 벡터. 알파 ${a.toFixed(3)}, 베타 ${b.toFixed(3)}. 0의 확률 ${(a * a * 100).toFixed(1)}퍼센트, 1의 확률 ${(b * b * 100).toFixed(1)}퍼센트.`}
        >
          <line x1="140" y1="210" x2="380" y2="210" className="cn-axis" />
          <line x1="140" y1="210" x2="140" y2="25" className="cn-axis" />
          <path d="M 300 210 A 160 160 0 0 0 140 50" className="cn-guide" />
          <line
            x1={140 + 160 * a}
            y1={210 - 160 * b}
            x2={140 + 160 * a}
            y2="210"
            className="cn-guide"
          />
          <line
            x1="140"
            y1={210 - 160 * b}
            x2={140 + 160 * a}
            y2={210 - 160 * b}
            className="cn-guide"
          />
          <line
            x1="140"
            y1="210"
            x2={140 + 160 * a}
            y2={210 - 160 * b}
            className="cn-vector"
          />
          <circle
            cx={140 + 160 * a}
            cy={210 - 160 * b}
            r="4"
            className="cn-dot"
          />
          <text x="390" y="215">
            |0⟩ · α
          </text>
          <text x="115" y="20">
            |1⟩ · β
          </text>
          <text x="150" y="238">
            계수 α, β의 평면
          </text>
        </svg>
        <figcaption>
          가로·세로는 두 기저의 계수다. 그림의 각도는 이 계수 평면에서 잰다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {angle === 0
            ? "첫 기저 |0⟩만 남으므로, 이 기준으로 측정하면 항상 0이 나온다."
            : angle === 90
              ? "둘째 기저 |1⟩만 남으므로, 이 기준으로 측정하면 항상 1이 나온다."
              : angle === 30
                ? "계수는 약 0.866과 0.500이며, 제곱하면 확률 75%와 25%가 된다."
                : angle === 45
                  ? "두 계수는 각각 약 0.707이다. 제곱한 확률은 각각 50%다."
                  : "상태 벡터를 각 기준축에 내려 읽은 값이 계수다. 계수의 크기를 제곱하면 확률이 된다."}
        </span>
        계수 α ≈ {a.toFixed(3)}, β ≈ {b.toFixed(3)}
      </div>
      <div
        className="cn-probabilities"
        role="img"
        aria-label={`0의 확률 ${(a * a * 100).toFixed(1)}퍼센트, 1의 확률 ${(b * b * 100).toFixed(1)}퍼센트`}
      >
        <div>
          <span>0의 확률 |α|² · {(a * a * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${a * a * 100}%` }} />
          </div>
        </div>
        <div>
          <span>1의 확률 |β|² · {(b * b * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${b * b * 100}%` }} />
          </div>
        </div>
      </div>
      <p>
        일반적인 상태에서는 두 계수에 복소수 위상도 들어간다. 지금 그림은 그중
        실수 계수만 사용한 일부 상태를 보여준다. 그 추가 정보를 구면 위에서
        표현하는 방법이 뒤에서 살펴볼 블로흐 구면이다.
      </p>

      <h4>기저를 바꾸면 같은 상태도 다르게 표현된다</h4>
      <p>
        앞에서는 |0⟩과 |1⟩을 기저로 사용했다. 그런데 다른 기저를 선택할 수도
        있다.
      </p>
      <Equation name="hilbert-other-basis" />
      <p>이 두 벡터도 서로 직교하고 길이가 1인 정규 직교 기저 벡터다.</p>
      <p>이제 |0⟩을 새로운 기저로 표현하면 어떻게 될까?</p>
      <Equation name="hilbert-rebase" />
      <p>
        원래는 |0⟩이라는 하나의 기저 상태였는데, 새로운 기저에서는 두 상태의
        중첩으로 표현된다. 위의 |+⟩와 |−⟩를 더해보면 |1⟩ 성분은 상쇄되고 |0⟩
        성분만 남는 것을 확인할 수 있다.
      </p>
      <p>
        하지만 실제 양자 상태가 바뀐 것은 아니다. 상태를 표현하는 좌표계만
        달라진 것이다.
      </p>
      <p>
        여기서 실제 측정 방향까지 바꾸면 관측 확률도 달라진다. 같은 |0⟩ 상태를
        Z축으로 측정하면 |0⟩이 100% 나오지만, X축으로 측정하면 |+⟩와 |−⟩가 각각
        50%로 나온다. 단순히 같은 실험을 다른 좌표로 적는 것과, 서로 다른 기준을
        구분하는 측정을 실제로 하는 것은 구별해야 한다.
      </p>
      <p className="cn-task" id="hilbert-basis-task">
        아래에서는 준비한 상태를 |0⟩로 고정하고 Z축·X축 측정 기준만 바꾼다. 검은
        상태 벡터가 그대로 있는지 보자. 바뀌는 것은 회색 기저와 그 기준의 계수,
        그리고 해당 측정을 했을 때의 확률이다.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="고정된 0 상태의 측정 기준"
        aria-describedby="hilbert-basis-task"
      >
        <button
          type="button"
          aria-pressed={isZ}
          onClick={() => setMeasurementBasis("z")}
        >
          Z축 기준 |0⟩, |1⟩
        </button>
        <button
          type="button"
          aria-pressed={!isZ}
          onClick={() => setMeasurementBasis("x")}
        >
          X축 기준 |+⟩, |−⟩
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="60 0 520 275"
          role="img"
          aria-label={`같은 상태 0을 ${isZ ? "Z" : "X"} 기저로 표현한 그림. 검은 상태 벡터는 고정되고, 측정 확률은 ${isZ ? "0이 100퍼센트, 1이 0퍼센트" : "플러스와 마이너스가 각각 50퍼센트"}.`}
        >
          <defs>
            <marker
              id="hilbert-basis-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
            </marker>
            <marker
              id="hilbert-state-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          <g className="cn-axis" markerEnd="url(#hilbert-basis-arrow)">
            <line
              x1="225"
              y1="145"
              x2={isZ ? 355 : 225 + 130 * Math.SQRT1_2}
              y2={isZ ? 145 : 145 - 130 * Math.SQRT1_2}
            />
            <line
              x1="225"
              y1="145"
              x2={isZ ? 225 : 225 + 130 * Math.SQRT1_2}
              y2={isZ ? 15 : 145 + 130 * Math.SQRT1_2}
            />
          </g>
          {!isZ && (
            <>
              <line x1="355" y1="145" x2="290" y2="80" className="cn-guide" />
              <line x1="355" y1="145" x2="290" y2="210" className="cn-guide" />
              <circle cx="290" cy="80" r="3" fill="#71717a" />
              <circle cx="290" cy="210" r="3" fill="#71717a" />
            </>
          )}
          <line
            x1="225"
            y1="145"
            x2="355"
            y2="145"
            className="cn-vector"
            markerEnd="url(#hilbert-state-arrow)"
          />
          <text x="370" y="140">
            상태 |0⟩
          </text>
          {isZ ? (
            <>
              <text x="370" y="180" className="cn-lesson-angle">
                기준 |0⟩
              </text>
              <text x="240" y="25" className="cn-lesson-angle">
                기준 |1⟩
              </text>
            </>
          ) : (
            <>
              <text x="332" y="48" className="cn-lesson-angle">
                기준 |+⟩
              </text>
              <text x="332" y="247" className="cn-lesson-angle">
                기준 |−⟩
              </text>
            </>
          )}
        </svg>
        <figcaption>
          검은 선: 고정된 상태 |0⟩ · 회색 선: 선택한 기저
          <br />
          계수 평면의 그림이다. 점선은 같은 상태를 새 기저에 내려 읽은 계수를
          보여준다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>준비한 상태 |0⟩ · {isZ ? "Z축 측정" : "X축 측정"}</strong>
        <span className="cn-observation">
          {isZ
            ? "기저 계수는 1과 0이다. 측정하면 0이 100%, 1이 0%로 나온다."
            : "기저 계수는 각각 1/√2 ≈ 0.707이다. 측정하면 +와 −가 각각 50%로 나온다."}
        </span>
      </div>
      <p>
        이것이 양자역학에서 측정 방향이 중요한 이유다. 앞서 CHSH 부등식에서
        앨리스와 밥은 서로 다른 측정 방향을 선택했다. 그 선택은 수학적으로는
        서로 다른 기저 상태들을 구분하는 측정을 고르는 것과 연결된다. 같은 얽힌
        상태를 준비해도, 둘이 어떤 방향을 선택하는지에 따라 결과의 상관관계가
        달라지는 것이다.
      </p>

      <h4>두 입자를 함께 다루면 힐베르트 공간도 커진다</h4>
      <p>
        전자 하나의 스핀 상태는 2차원 복소 힐베르트 공간으로 표현할 수 있었다.
        그럼 두 전자의 스핀을 함께 표현하려면 어떻게 해야 할까?
      </p>
      <p>
        두 공간의 텐서곱(Tensor Product)을 사용한다. 첫 입자의 두 기저와 둘째
        입자의 두 기저를 조합하면, 두 입자를 함께 표현할 네 기저 벡터를 얻는다.
      </p>
      <Equation name="hilbert-tensor" />
      <p>
        두 입자 각각 2차원이므로 전체는 2×2인 4차원이다. 예를 들어 |01⟩는 첫
        입자가 |0⟩, 둘째 입자가 |1⟩인 상태를 나타낸다. 일반적인 두 입자 상태는
        위의 네 기저 벡터의 조합으로 표현할 수 있다.
      </p>
      <p>그중 특별한 상태가 바로 벨 상태(Bell State)다.</p>
      <Equation name="hilbert-bell" />
      <p>
        이 상태는 한 입자의 상태와 다른 입자의 상태를 단순히 곱해서 표현할 수
        없다. 각각의 상태에 0과 1 성분을 넣어 곱하면 |00⟩와 |11⟩뿐 아니라 |01⟩와
        |10⟩ 성분도 생기기 때문이다. 위 식처럼 앞의 두 성분만 남길 수는 없다.
        이런 순수 상태를 양자 얽힘 상태라고 한다.
      </p>
      <p>
        다만 Z축에서 00과 11이 반씩 나온다는 사실만으로 얽힘을 확인할 수 있는
        것은 아니다. 00 또는 11을 확률적으로 준비한 경우와 구별하려면, 다른 측정
        기준에서 얻는 통계도 함께 봐야 한다.
      </p>
      <p>
        여기서 중요한 점이 있다. 입자를 함께 다루는 힐베르트 공간의 차원은 입자
        수에 따라 빠르게 커진다. 전자 스핀처럼 두 기저 상태를 갖는 큐비트가
        n개라면, 각 큐비트의 두 기저를 조합하므로 차원은 다음과 같다.
      </p>
      <Equation name="hilbert-dimension" />
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">큐비트 수</th>
              <th scope="col">상태 공간의 차원</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 10, 20].map((n) => (
              <tr key={n}>
                <th scope="row">{n}개</th>
                <td>{(2 ** n).toLocaleString("ko-KR")}차원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        여기서 차원은 독립적인 복소 기저 벡터의 수를 뜻한다. 물리적인 공간의
        차원이 늘어난다는 의미는 아니다.
      </p>
      <p>
        양자컴퓨터를 설명할 때 힐베르트 공간이 자주 등장하는 이유이기도 하다.
        다만 상태 공간의 차원이 빠르게 커진다고 해서 그 모든 정보를 측정 한
        번으로 읽어낼 수 있는 것은 아니다. 한 번의 측정에서 얻는 것은 선택한
        기저에 대응하는 결과 중 하나다.
      </p>

      <h4>드브로이–봄 이론과는 어떻게 연결될까?</h4>
      <p>이제 앞서 살펴본 드브로이–봄의 유도 방정식과 연결해보자.</p>
      <p>
        앞에서는 전자의 스핀 상태를 다뤘다. 이번에는 입자의 공간적 상태를
        생각해보자.
      </p>
      <p>
        양자 상태를 적는 |ψ⟩는 추상적인 힐베르트 공간의 상태 벡터다. 입자의
        공간적 상태를 위치 기저(Position Basis)로 표현하면 어떻게 될까?
      </p>
      <Equation name="hilbert-position" />
      <p>
        바로 우리가 흔히 이야기하는 파동함수가 된다. 오른쪽의 ⟨x|ψ⟩는 상태 |ψ⟩를
        위치 x에 대해 표현한 계수라는 뜻이다.
      </p>
      <p>
        스핀 상태를 |0⟩과 |1⟩의 계수로 표현한 것처럼, 입자의 공간적 상태는 각
        위치에 대응하는 계수로 표현할 수 있다. 이번에는 위치가 연속적으로
        바뀌므로, 두 개의 계수 대신 위치에 대한 함수가 되는 것이다.
      </p>
      <p>
        엄밀하게는 정확한 위치 하나를 가리키는 |x⟩가 일반적인 정규화 가능 벡터는
        아니다. 위치가 연속적이기 때문에 사용하는 일반화된 기저다.
      </p>
      <p>
        스핀이 없는 입자 하나가 3차원 공간에서 움직인다면 파동함수는 ψ(x, t)로
        표현한다. 이때 x는 세 위치 좌표를 묶은 벡터다. 가능한 위치 전체에서
        확률을 더하면 1이 되어야 하므로, 정규화 조건은 다음과 같다.
      </p>
      <Equation name="hilbert-position-norm" />
      <p>
        앞에서는 두 계수의 절댓값 제곱을 더했지만, 여기서는 연속적인 위치 전체에
        대해 적분한다. 이런 파동함수가 속하는 대표적인 힐베르트 공간이 L²(ℝ³),
        즉 제곱적분 가능한 복소 함수들의 공간이다.
      </p>
      <p>
        드브로이–봄의 유도 방정식에 등장하는 ψ도 이렇게 위치 표현으로 나타낸
        파동함수다. 즉, 힐베르트 공간의 추상적인 상태 벡터를 위치 기저로 표현한
        뒤, 그 표현의 위상 기울기에서 입자의 속도를 계산하는 것이다.
      </p>

      <h4>지금까지의 개념을 하나로 연결하면</h4>
      <p>
        힐베르트 공간은 양자 상태를 표현하는 추상적인 수학적 공간이다. 입자가
        돌아다니는 물리적 공간과 같은 것은 아니다.
      </p>
      <p>
        기저 벡터는 그 상태를 표현하는 좌표계 역할을 한다. 같은 상태도 기저에
        따라 하나의 기저 상태로 표현되기도 하고, 여러 기저 상태의 중첩으로
        표현되기도 한다.
      </p>
      <p>
        파동함수는 그 상태 벡터를 표현하는 방법 중 하나다. 스핀 기저로 표현하면
        스핀 측정 확률을, 위치 기저로 표현하면 위치 측정 확률을 구할 수 있다.
        물리적 상태와 그것을 표현하는 좌표를 구별하는 것이 중요하다.
      </p>

      <h4>본문의 오토마타와는 어떻게 연결될까?</h4>
      <p>
        이제 오토마타의 구별되는 상태마다 기저 벡터를 하나씩 붙인다고
        생각해보자. 상태 A에는 |A⟩, 상태 B에는 |B⟩를 대응시킨다. A와 B가 서로
        다른 상태라는 것을 두 기저가 직교하는 것으로 표현할 수 있다.
      </p>
      <p>
        A에서 B로, B에서 A로 바뀌는 전이라면 그 규칙을 아래처럼 적을 수 있다.
        U는 이 상태 전이를 벡터에 적용하는 연산이다.
      </p>
      <Equation name="hilbert-automaton" />
      <p>
        이 연산은 두 기저 벡터를 맞바꾸는 순열이다. 조합된 벡터에도 같은 규칙을
        선형적으로 적용하면 길이와 내적을 보존한다. 이런 성질을 가진 가역적인
        연산이 유니터리 연산이다. 여러 상태를 하나로 합쳐 되돌릴 수 없게 만드는
        전이는 이런 순열이 아니다.
      </p>
      <p>
        결정론적인 상태 전이도 이렇게 양자역학에서 사용하는 수학적 언어로 표현할
        수 있다. 다만 이 표현이 가능하다는 사실과, 실제 자연이 그 오토마타의
        규칙으로 움직인다는 주장은 별도로 검토해야 한다.
      </p>
    </div>
  );
}

function Attractor() {
  const [time, setTime] = useState(0);
  const { overview, first, second } = useMemo(() => {
    const overview = lorenz();
    const start = overview[0];
    return {
      overview,
      first: lorenz(start, 0, 30),
      second: lorenz([start[0] + 0.000001, start[1], start[2]], 0, 30),
    };
  }, []);
  // Both trajectories include the initial state, then one sample per .02 time units.
  const sampleIndex = Math.round(time / 0.02);
  const a = first[sampleIndex];
  const b = second[sampleIndex];
  const distance = Math.hypot(...a.map((value, i) => value - b[i]));
  const distanceLabel = distance.toLocaleString("ko-KR", {
    maximumSignificantDigits: 4,
    useGrouping: false,
  });
  const trace = (points: readonly (readonly number[])[]) =>
    points
      .map(
        ([x, , z], i) =>
          `${i ? "L" : "M"}${(260 + x * 9.5).toFixed(2)},${(245 - z * 4.2).toFixed(2)}`
      )
      .join(" ");
  const overviewPath = trace(overview);
  const spiral = (cx: number, target: number) =>
    Array.from({ length: 161 }, (_, i) => {
      const phase = i * 0.11;
      const radius = target + (75 - target) * Math.exp(-phase * 0.45);
      return `${i ? "L" : "M"}${(cx + radius * Math.cos(phase)).toFixed(2)},${(108 - radius * Math.sin(phase)).toFixed(2)}`;
    }).join(" ");

  return (
    <div className="cn-lesson">
      <p>가장 먼저 핵심을 정리하면 다음과 같다.</p>
      <ul>
        <li>
          끌개: 시간이 흐르면서 여러 초기 상태가 가까워지는 점이나 궤도, 또는
          집합.
        </li>
        <li>
          기묘한 끌개: 흔히 프랙탈 구조를 가진 끌개. 대표적인 예인 로렌츠
          끌개에서는 그 안의 운동도 복잡하고 비주기적이다.
        </li>
      </ul>
      <p>
        흥미로운 점은 운동이 일어나는 영역은 제한되어 있는데, 그 안에서 앞으로
        정확히 어떤 궤적을 따라갈지는 장기적으로 예측하기 어려울 수 있다는
        것이다. 어떻게 이 두 가지가 동시에 가능할까? 먼저 단순한 예부터
        생각해보자.
      </p>

      <h4>끌개란 무엇일까?</h4>
      <p>
        공이 그릇 안에서 굴러가는 상황을 생각해보자. 공을 어느 위치에서 놓든,
        마찰이 있다면 시간이 지나면서 그릇의 바닥으로 내려와 정지한다. 시작
        위치와 속도가 달라도 최종적으로 도달하는 상태는 같다.
      </p>
      <p>
        이때 바닥에서 정지한 상태를 끌개라고 부를 수 있다. 단지 바닥이라는
        위치만 뜻하는 것은 아니다. 공이 바닥에 있고 속도가 0이라는 상태 전체를
        가리킨다.
      </p>
      <p>
        그렇다고 끌개가 반드시 하나의 정지 상태여야 하는 것은 아니다. 운동이
        반복되는 궤도 전체도 끌개가 될 수 있다. 이 차이를 이해하려면 먼저
        움직임을 그리는 방법부터 살펴볼 필요가 있다.
      </p>

      <h4>움직임을 상태 공간에 그려보자</h4>
      <p>
        우리는 보통 물체의 움직임을 실제 공간에서 생각한다. 하지만 동역학에서는
        시스템의 상태를 하나의 점으로 표현한다.
      </p>
      <p>
        예를 들어 진자의 상태를 알려면 위치만으로는 부족하다. 같은 위치에 있어도
        오른쪽으로 움직이는지 왼쪽으로 움직이는지에 따라 다음 움직임이 달라진다.
        따라서 위치뿐 아니라 속도도 알아야 한다.
      </p>
      <Equation name="attractor-state" />
      <p>
        여기서 θ는 진자의 각도, ω는 각속도다. 이 두 값을 축으로 하는 공간이 상태
        공간(Phase Space)이다. 시간이 흐르면 상태를 나타내는 점이 움직이고, 그
        점이 그리는 선을 궤적(Trajectory)이라고 한다.
      </p>
      <p>
        앞의 공이 바닥에 멈추는 상황을 이 공간에 그리면, 여러 시작점의 궤적이
        하나의 점으로 모인다. 반면 일정한 진동을 계속한다면, 상태는 한 점에
        멈추는 대신 같은 닫힌 궤도를 반복해서 돈다.
      </p>
      <p>
        앞서 살펴본 힐베르트 공간과도 구별해야 한다. 그쪽은 양자 상태를 벡터로
        표현하는 공간이었고, 지금은 고전적인 시스템의 위치·속도 같은 상태
        변수들을 좌표로 삼고 있다.
      </p>

      <h4>한 점에 모이는 것과 같은 궤도를 반복하는 것은 다르다</h4>
      <p>
        마찰만 있는 진자는 결국 멈추지만, 에너지를 공급받아 진동을 유지하는
        시스템은 주변의 여러 상태에서 출발해 같은 주기 궤도로 접근할 수도 있다.
        이런 안정된 주기 궤도를 극한 주기 궤도(Limit Cycle)라고 한다.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label="고정점 끌개에서는 궤적이 한 점에 접근하고, 안정된 극한 주기 궤도에서는 닫힌 곡선에 접근하는 상태 공간 개념도"
        >
          <line x1="260" y1="15" x2="260" y2="202" stroke="#e4e4e7" />
          <line x1="35" y1="108" x2="225" y2="108" className="cn-axis" />
          <line x1="130" y1="20" x2="130" y2="195" className="cn-axis" />
          <path
            d={spiral(130, 0)}
            className="cn-trajectory"
            style={{ strokeWidth: 1.4 }}
          />
          <circle cx="130" cy="108" r="4" className="cn-dot" />
          <circle cx="205" cy="108" r="3" fill="#71717a" />
          <text x="130" y="225" textAnchor="middle">
            고정점 끌개
          </text>
          <line x1="295" y1="108" x2="485" y2="108" className="cn-axis" />
          <line x1="390" y1="20" x2="390" y2="195" className="cn-axis" />
          <circle
            cx="390"
            cy="108"
            r="45"
            fill="none"
            stroke="#27272a"
            strokeWidth="1.8"
          />
          <path
            d={spiral(390, 45)}
            className="cn-trajectory"
            style={{ strokeWidth: 1.1 }}
          />
          <circle cx="465" cy="108" r="3" fill="#71717a" />
          <text x="390" y="225" textAnchor="middle">
            안정된 극한 주기 궤도
          </text>
        </svg>
        <figcaption>
          왼쪽은 한 점으로, 오른쪽은 닫힌 궤도 전체로 접근한다. 상태 공간의
          개념도이며, 실제 공이 지나가는 길을 그린 것은 아니다.
        </figcaption>
      </figure>
      <p>
        수학적으로는 여러 초기 상태가 시간이 지날수록 가까워지는 불변 집합을
        생각한다. 불변이라는 것은 그 집합 안에서 출발하면 이후에도 그 안에
        머문다는 뜻이다. 어떤 끌개로 접근하는 초기 상태들의 영역은 끌림
        영역(Basin of Attraction)이라고 한다.
      </p>
      <p>
        고정점에서는 어디에 멈출지, 주기 궤도에서는 어떤 움직임을 반복할지
        비교적 쉽게 파악할 수 있다. 그런데 다음 종류는 이야기가 달라진다.
      </p>

      <h4>기묘한 끌개의 대표적인 예, 로렌츠 끌개</h4>
      <p>
        아래의 나비 날개처럼 생긴 구조가 로렌츠 끌개(Lorenz Attractor)다. 1963년
        에드워드 로렌츠가 대류 현상을 단순화한 수학 모형을 연구하면서 발견했다.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label="로렌츠 방정식을 계산한 50 모형 시간 동안의 궤적. x와 z를 보여주는 투영으로, 궤적이 양쪽 날개 모양의 영역을 오간다"
        >
          <line x1="35" y1="245" x2="485" y2="245" className="cn-axis" />
          <line x1="260" y1="245" x2="260" y2="20" className="cn-axis" />
          <path d={overviewPath} className="cn-trajectory" />
          <text x="490" y="249">
            x
          </text>
          <text x="270" y="25">
            z
          </text>
        </svg>
        <figcaption>
          세 상태 변수 x, y, z 중 x와 z만 평면에 옮긴 그림이다. 나비 모양의
          물체가 아니라 상태가 이동한 흔적을 보여준다.
        </figcaption>
      </figure>
      <p>
        선 하나하나는 시간이 흐르면서 상태가 이동한 흔적이다. 상태는 왼쪽 날개를
        몇 번 돌다가 오른쪽으로 넘어가고, 다시 왼쪽으로 돌아온다. 전체적으로는
        한정된 영역에 머물지만, 전형적인 궤적은 같은 운동을 주기적으로 반복하지
        않는다.
      </p>
      <p>이 복잡한 운동을 만드는 규칙은 세 개의 미분방정식이다.</p>
      <Equation name="lorenz" />
      <p>
        왼쪽의 dx/dt 같은 표기는 각 상태 변수가 시간에 따라 얼마나 변하는지를
        뜻한다. σ, ρ, β는 모형의 계수이고, 위 그림에서는 고전적으로 널리 쓰는
        다음 값을 고정했다.
      </p>
      <Equation name="lorenz-parameters" />
      <p>
        여기에는 난수도, 다음 순간을 고르는 확률적 선택도 없다. 현재 상태가
        정확히 주어지면 다음 변화가 정해진다. 그런데도 장기적인 운동은 몹시
        불규칙해진다. 그렇다면 예측을 어렵게 만드는 것은 무엇일까?
      </p>

      <h4>왜 같은 끌개에 모이는데도 예측이 어려울까?</h4>
      <p>
        서로 거의 같은 초기 상태에서 출발하는 두 시스템을 생각해보자. 처음에는
        궤적이 거의 일치하지만, 시간이 지나면서 큰 차이가 생길 수 있다. 이것이
        초기 조건에 대한 민감성이다.
      </p>
      <p>
        아래에서는 같은 로렌츠 방정식으로 두 궤적을 계산했다. 두 시작 상태는
        x값만 0.000001만큼 다르고, y와 z는 같다. 계산 중에는 방정식의 계수나
        외부 조건을 바꾸지 않는다.
      </p>
      <p className="cn-task" id="attractor-task">
        시간을 0 → 10 → 20으로 옮겨보자. 실선과 점선은 각각 두 궤적의 최근
        움직임이고, 채운 점과 빈 점은 같은 시각의 상태다. 처음에는 겹쳐 보이지만
        나중에는 서로 다른 곳에 있다. 전체적으로 비슷한 영역을 돈다는 것과, 같은
        시각에 같은 상태에 있다는 것은 다르다는 점을 비교해보자.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="가까운 두 시작 상태의 관찰 시각"
        aria-describedby="attractor-task"
      >
        {[0, 10, 20, 30].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={time === value}
            onClick={() => setTime(value)}
          >
            시간 {value}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        관찰 시작 후 모형 시간 <output>{time.toFixed(1)}</output>
        <input
          type="range"
          min="0"
          max="30"
          step="0.1"
          value={time}
          aria-label="가까운 두 로렌츠 상태의 관찰 시간"
          aria-describedby="attractor-task"
          onChange={(e) => setTime(+e.target.value)}
        />
      </label>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label={`모형 시간 ${time}. 처음에 x만 백만분의 일만큼 달랐던 두 상태의 현재 거리는 ${distance.toExponential(2)}. 채운 점은 A, 빈 점은 B이고, 실선과 점선은 최근 궤적이다.`}
        >
          <line x1="35" y1="245" x2="485" y2="245" className="cn-axis" />
          <line x1="260" y1="245" x2="260" y2="20" className="cn-axis" />
          <path
            d={overviewPath}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="0.65"
          />
          <path
            d={trace(
              first.slice(Math.max(0, sampleIndex - 100), sampleIndex + 1)
            )}
            fill="none"
            stroke="#27272a"
            strokeWidth="1.5"
          />
          <path
            d={trace(
              second.slice(Math.max(0, sampleIndex - 100), sampleIndex + 1)
            )}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <circle
            cx={260 + b[0] * 9.5}
            cy={245 - b[2] * 4.2}
            r="6"
            fill="#fafafa"
            stroke="#52525b"
            strokeWidth="1.5"
          />
          <circle
            cx={260 + a[0] * 9.5}
            cy={245 - a[2] * 4.2}
            r="4"
            className="cn-current"
          />
          <text x="490" y="249">
            x
          </text>
          <text x="270" y="25">
            z
          </text>
        </svg>
        <figcaption>
          A: 실선·채운 점 / B: 점선·빈 점. 옅은 선은 전체 모양을 보여준다.
          <br />
          그림은 x–z 투영이며, 거리는 생략한 y를 포함한 세 변수로 구한다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>같은 시각의 두 상태 사이 거리 ≈ {distanceLabel}</strong>
        <span className="cn-observation">
          {time === 0
            ? "시작할 때의 차이는 약 0.000001이다. 이 축척에서는 두 점이 겹쳐 보인다."
            : distance < 0.1
              ? "차이가 생기고 있지만 아직 두 점은 가까이 있다. 시간을 더 옮겨 같은 시각의 상태를 비교해보자."
              : "두 상태는 같은 끌개 주변을 움직이면서도 서로 다른 위치에 있다. 출발할 때 가까웠더라도, 오랜 시간이 지난 뒤까지 서로 가까이 있지는 않는다."}
        </span>
      </div>
      <p>
        이 차이는 매 순간 똑같은 비율로 커지는 것은 아니다. 다만 차이가 충분히
        작은 동안에는 다음과 같은 지수적 증가로 그 경향을 설명할 수 있다.
      </p>
      <Equation name="attractor-sensitivity" />
      <p>
        δ₀는 초기 상태의 차이, δ(t)는 시간 t가 지난 뒤의 차이다. λ는 차이가
        얼마나 빠르게 늘어나거나 줄어드는지 나타내는 리아프노프 지수(Lyapunov
        Exponent)다. 가장 큰 지수가 양수이면 가까운 궤적 사이의 작은 차이가
        평균적으로 증폭되는 방향이 있다.
      </p>
      <p>
        이것이 나비효과(Butterfly Effect)의 수학적 핵심이다. 다만 전체 운동이
        한정된 영역에 머무르므로, 두 상태의 차이가 무한히 커지는 것은 아니다. 위
        그림도 방정식의 유한한 시간 동안을 수치 계산한 예이며, 혼돈을 수학적으로
        증명한 그림은 아니다.
      </p>

      <h4>서로 벌어지는데, 어떻게 같은 끌개에 머물 수 있을까?</h4>
      <p>
        여기서 중요한 의문이 생긴다. 서로 가까운 궤적들이 벌어진다면, 어떻게
        전체적으로는 같은 끌개에 모일 수 있을까?
      </p>
      <p>
        답은 서로 다른 방향에서 수축과 팽창이 동시에 일어나기 때문이다. 어떤
        방향에서는 가까운 상태들이 벌어지지만, 다른 방향에서는 간격이 줄어든다.
        또 펼쳐진 궤적이 되돌아오며 접히기 때문에 전체 운동은 한정된 영역에 머물
        수 있다.
      </p>
      <p>
        즉, 끌개라는 집합에 가까워진다는 것과 그 집합 안의 두 상태가 서로
        가까워진다는 것은 다른 이야기다. 한 점으로 모이는 끌개에서는 둘이 함께
        일어나지만, 로렌츠 끌개에서는 집합으로 접근하면서도 그 안의 서로 가까운
        궤적은 벌어질 수 있다.
      </p>

      <h4>여기서 왜 프랙탈 구조가 등장할까?</h4>
      <p>
        늘어나고, 압축되고, 접히는 과정을 반복하면 어떤 구조가 남을까? 매끈한
        선이나 한 장의 곡면 대신, 더 작은 규모에서도 층 사이에 또 다른 층과 틈이
        나타나는 구조가 생길 수 있다.
      </p>
      <p>
        프랙탈(Fractal)은 이렇게 확대할수록 세밀한 구조가 드러나는 기하학적
        대상이다. 일부 프랙탈은 크기를 바꿔도 정확히 같은 무늬가 반복되지만,
        모든 프랙탈이 그런 완벽한 자기유사성을 갖는 것은 아니다.
      </p>
      <p>
        로렌츠 끌개는 3차원 상태 공간 안에 있지만 그 공간을 꽉 채우지는 않는다.
        얇은 층들이 겹친 구조에서 프랙탈적인 성질이 나타난다. 다만 화면에 그린
        몇 바퀴의 선만 확대한다고 그 구조를 그대로 확인할 수 있는 것은 아니다.
        다음 보충 설명의 칸토어 집합은 작은 규모에 구조가 계속 남는다는 뜻을 더
        단순한 예로 보여준다.
      </p>
      <p>
        기묘한 끌개라는 용어의 엄밀한 정의에는 여러 방식이 있다. 여기서는 로렌츠
        끌개처럼 프랙탈적인 구조와 혼돈적인 운동이 함께 나타나는 대표적인 사례를
        생각하면 된다.
      </p>

      <h4>그렇다면 결정론과 예측은 어떻게 다를까?</h4>
      <p>
        이제 처음의 질문으로 돌아가보자. 모든 사건이 이전 상태에 의해 결정된다는
        것과, 관찰자가 모든 미래를 정확히 예측할 수 있다는 것은 같은 주장일까?
      </p>
      <p>
        로렌츠 모형에서는 운동 규칙이 결정론적이어도 초기 상태의 작은 오차가
        나중에는 큰 차이가 된다. 초기 상태를 더 정밀하게 알면 예측할 수 있는
        시간을 늘릴 수 있지만, 유한한 정밀도로 먼 미래의 개별 상태까지 계속
        정확히 맞힐 수 있다는 보장은 없다.
      </p>
      <p>
        그렇다고 아무것도 예측할 수 없다는 뜻은 아니다. 정확히 어느 순간 왼쪽
        날개에 있을지는 맞히기 어려워도, 운동이 어떤 영역에 머무르는지나 오랜
        시간 동안 어떤 통계적 성질을 보이는지는 연구할 수 있다. 개별 상태의
        미래와 전체 운동의 구조에 대한 예측은 구별할 수 있는 것이다.
      </p>
      <p>
        혼돈이론이 우주 전체가 결정론적이라고 증명한 것은 아니다. 결정론적인
        수학적 규칙만으로도 복잡하고 장기적으로 예측하기 어려운 운동이 생길 수
        있다는 것을 보여준다. 본문에서 이어지는 우주 불변집합 역시 이 사례에서
        곧바로 도출되는 결론이 아니라, 별도로 검토해야 할 물리적 가설이다.
      </p>
    </div>
  );
}

function Cantor() {
  const [stage, setStage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const segments = cantor(stage);
  const zoomSegments = cantor(zoom ? 2 : 3);

  return (
    <div className="cn-lesson">
      <p>
        앞에서는 기묘한 끌개가 프랙탈 구조를 가질 수 있다고 했다. 그런데
        ‘확대해도 세밀한 구조가 나타난다’는 것은 구체적으로 어떤 모습일까?
        이번에는 움직이는 궤적 대신, 선분 하나에서 시작해보자.
      </p>

      <h4>프랙탈은 단순히 복잡한 모양을 뜻할까?</h4>
      <p>
        그림이 복잡해 보인다는 것만으로 프랙탈이라고 하지는 않는다. 작은
        규모에서도 구조가 계속 드러나고, 그 구조가 확대 비율과 어떤 관계를
        갖는지가 중요하다.
      </p>
      <p>
        그중 작은 부분을 확대했을 때 전체와 같은 구조가 나오는 성질을
        자기유사성(Self-similarity)이라고 한다. 칸토어 집합은 이 성질을 정확하게
        보여주는 예다. 먼저 만드는 규칙을 살펴보고, 실제로 어떤 부분이
        반복되는지 확인해보자.
      </p>

      <h4>선분에서 가운데 부분만 지워보자</h4>
      <p>
        길이가 1인 선분, 즉 0부터 1까지의 모든 점에서 시작한다. 이를 세 등분한
        뒤 가운데 1/3의 내부를 지운다. 그러면 0부터 1/3까지와 2/3부터 1까지, 두
        구간이 남는다. 경계인 1/3과 2/3은 지우지 않고 남겨둔다.
      </p>
      <p>
        이제 남은 두 구간에도 같은 규칙을 적용해보자. 각각의 가운데 1/3을 지우면
        길이가 1/9인 네 구간이 남는다. 다음에는 그 네 구간 각각에서 가운데를
        지운다. 규칙은 처음부터 끝까지 같다.
      </p>
      <p className="cn-task" id="cantor-task">
        ‘한 단계 진행’을 두 번 눌러보자. 한 구간이 두 구간으로 나뉠 때마다 구간
        수는 늘지만, 남은 전체 길이는 줄어든다. 검은 구간과 그 아래의 수치를
        함께 비교해보자. 각 줄은 같은 0~1 범위를 보여준다.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="칸토어 집합 구성"
        aria-describedby="cantor-task"
      >
        <button
          type="button"
          onClick={() => setStage(0)}
          disabled={stage === 0}
        >
          처음으로
        </button>
        <button
          type="button"
          onClick={() => setStage(Math.min(5, stage + 1))}
          disabled={stage === 5}
        >
          한 단계 진행
        </button>
      </div>
      <label className="cn-slider">
        제거 단계 <output>{stage}</output>
        <input
          aria-label="칸토어 집합 제거 단계"
          aria-describedby="cantor-task"
          type="range"
          min="0"
          max="5"
          value={stage}
          onChange={(e) => setStage(+e.target.value)}
        />
      </label>
      <figure className="cn-lesson-figure">
        <svg
          viewBox={`0 0 520 ${90 + stage * 34}`}
          role="img"
          aria-label={`칸토어 집합의 0단계부터 ${stage}단계까지. 현재 남은 구간 ${segments.length}개, 전체 길이는 처음의 ${(100 * (2 / 3) ** stage).toFixed(1)}퍼센트`}
        >
          {Array.from({ length: stage + 1 }, (_, n) => (
            <g key={n}>
              <text x="10" y={36 + n * 34}>
                {n}단계
              </text>
              <line
                x1="80"
                y1={31 + n * 34}
                x2="490"
                y2={31 + n * 34}
                stroke="#e4e4e7"
              />
              {cantor(n).map(([a, b], i) => (
                <rect
                  key={i}
                  x={80 + 410 * a}
                  y={25 + n * 34}
                  width={410 * (b - a)}
                  height="12"
                  className="cn-dot"
                />
              ))}
            </g>
          ))}
          <text x="80" y={72 + stage * 34}>
            0
          </text>
          <text x={80 + 410 / 3} y={72 + stage * 34} textAnchor="middle">
            1/3
          </text>
          <text x={80 + 820 / 3} y={72 + stage * 34} textAnchor="middle">
            2/3
          </text>
          <text x="490" y={72 + stage * 34} textAnchor="end">
            1
          </text>
        </svg>
        <figcaption>
          검은 부분이 남은 구간이다. 흰 틈은 제거한 부분이며, 끝점은 남긴다.
          화면은 최대 5단계까지의 근사다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          {segments.length}개 구간 · 각 길이{" "}
          {stage === 0 ? "1" : `1/${3 ** stage}`} · 전체 길이{" "}
          {stage === 0 ? "1" : `${2 ** stage}/${3 ** stage}`} ≈{" "}
          {(100 * (2 / 3) ** stage).toFixed(1)}%
        </strong>
        <span className="cn-observation">
          {stage === 0
            ? "아직 제거하지 않았다. 길이 1인 구간 하나에서 시작한다."
            : `구간 수는 직전의 두 배가 되었지만, 전체 길이는 직전의 2/3만 남았다. 구간의 개수와 그 길이는 다른 방식으로 변한다.`}
        </span>
      </div>
      <p>
        이 일을 끝없이 반복했을 때, 어느 단계에서도 지워지지 않는 점들을 모은
        것이 칸토어 집합이다. 특정 단계에서 남아 있는 구간들과, 무한한 과정을
        거쳐 정의하는 최종 집합은 구별해야 한다.
      </p>

      <h4>길이가 0이면 아무것도 남지 않는 걸까?</h4>
      <p>
        전체 길이는 1, 2/3, 4/9, 8/27 순서로 줄어든다. 매번 직전 길이의 2/3만
        남으므로, n번 반복했을 때의 길이는 다음과 같다.
      </p>
      <Equation name="cantor-length" />
      <p>
        이 값은 반복을 계속하면 0에 한없이 가까워진다. 최종 칸토어 집합의 길이도
        0이다. 그렇다면 모든 점이 사라진 것일까?
      </p>
      <p>
        그렇지 않다. 처음부터 남겨둔 0과 1은 어느 단계에서도 지워지지 않는다.
        1/3, 2/3처럼 제거한 구간의 끝점들도 계속 남는다. 길이가 0이라는 것과
        집합이 비어 있다는 것은 다른 말이다.
      </p>
      <p>
        끝점만 남는 것도 아니다. 매 단계에서 왼쪽 구간을 고를지 오른쪽 구간을
        고를지 생각해보자. 선택을 계속하면 구간의 길이는 점점 작아지고, 끝없이
        이어지는 선택 하나가 최종적으로 점 하나를 정한다.
      </p>
      <p>
        예를 들어 왼쪽, 오른쪽, 왼쪽, 오른쪽을 계속 번갈아 고르면 1/4이라는
        점으로 좁혀진다. 오른쪽을 고를 때마다 더해지는 이동량을 합하면 아래와
        같다. 이 점은 어느 단계의 끝점도 아니지만, 가운데 부분에 들어가지
        않으므로 끝까지 남는다.
      </p>
      <Equation name="cantor-quarter" />
      <p>
        이런 무한한 선택의 열은 자연수처럼 하나씩 번호를 붙여 모두 나열할 수도
        없을 만큼 많다. 칸토어 집합의 점들도 그런 의미에서 셀 수 없이 많다. 점이
        얼마나 많은가와 점들이 차지하는 길이가 얼마인가는 다른 질문인 것이다.
      </p>

      <h4>작은 조각을 확대하면 무엇이 보일까?</h4>
      <p>
        이제 남아 있는 모양을 다시 보자. 처음의 왼쪽 1/3 안에서도 가운데를
        지우는 일이 똑같이 반복됐다. 오른쪽 1/3에서도 마찬가지다. 따라서 최종
        집합의 왼쪽 부분을 세 배 확대하면 전체와 같은 구조가 나온다.
      </p>
      <p className="cn-task" id="cantor-zoom-task">
        이번에는 3단계의 모양을 고정하고, ‘왼쪽 1/3 확대’를 선택해보자. 위쪽에서
        테두리로 표시한 부분을 아래쪽의 같은 폭으로 늘려 보여준다. 작은 부분
        안에도 가운데가 비고 양쪽으로 갈라지는 구조가 들어 있다는 점을 보자.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="칸토어 집합 자기유사성 보기"
        aria-describedby="cantor-zoom-task"
      >
        <button
          type="button"
          aria-pressed={!zoom}
          onClick={() => setZoom(false)}
        >
          전체 보기
        </button>
        <button type="button" aria-pressed={zoom} onClick={() => setZoom(true)}>
          왼쪽 1/3 확대
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 215"
          role="img"
          aria-label={
            zoom
              ? "3단계 근사에서 왼쪽 1/3을 세 배 확대하면 2단계 전체와 같은 모양이 된다"
              : "3단계 근사 전체를 위아래 같은 폭으로 보여준다. 왼쪽 1/3을 선택해 확대할 수 있다"
          }
        >
          <text x="20" y="23">
            3단계 근사 전체
          </text>
          <line x1="80" y1="54" x2="490" y2="54" stroke="#e4e4e7" />
          {cantor(3).map(([a, b], i) => (
            <rect
              key={i}
              x={80 + 410 * a}
              y="48"
              width={410 * (b - a)}
              height="12"
              fill={zoom && a > 1 / 3 ? "#a1a1aa" : "#27272a"}
            />
          ))}
          <rect
            x="77"
            y="40"
            width={zoom ? 410 / 3 + 6 : 416}
            height="28"
            fill="none"
            stroke="#71717a"
          />
          <text x="20" y="116">
            {zoom ? "왼쪽 1/3을 3배 확대" : "선택한 전체를 같은 크기로 표시"}
          </text>
          <line x1="80" y1="147" x2="490" y2="147" stroke="#e4e4e7" />
          {zoomSegments.map(([a, b], i) => (
            <rect
              key={i}
              x={80 + 410 * a}
              y="141"
              width={410 * (b - a)}
              height="12"
              className="cn-dot"
            />
          ))}
          <text x="80" y="182">
            0
          </text>
          <text x="490" y="182" textAnchor="end">
            {zoom ? "1/3" : "1"}
          </text>
        </svg>
        <figcaption>
          위쪽 테두리 안의 점들을 아래쪽에 확대해 그린다. 보기만 바꾸며, 점을
          새로 만들거나 추가로 지우지는 않는다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        {zoom
          ? "3단계 근사의 왼쪽 1/3을 세 배 확대했다. 그 안의 네 구간은 2단계 전체와 같은 모양으로 배치되어 있다."
          : "3단계 근사의 전체 모습이다. 왼쪽 1/3을 확대해 그 안에도 같은 분할 규칙이 들어 있는지 비교해보자."}
      </div>
      <p>
        유한한 단계의 그림에서는 확대할 때 남아 있는 세부 단계가 하나 줄어든다.
        위의 예가 3단계와 2단계를 비교하는 이유다. 하지만 끝없이 반복한 최종
        집합에는 마지막 단계가 없으므로, 부분을 확대해도 전체와 정확히 같은
        구조를 얻는다. 이것이 칸토어 집합의 자기유사성이다.
      </p>
      <p>
        다만 모든 프랙탈이 칸토어 집합처럼 정확히 같은 모양을 반복하는 것은
        아니다. 앞의 로렌츠 끌개도 이 선분과 모양이 같은 것은 아니다. 작은
        규모에서도 구조를 살펴봐야 한다는 공통점을 이 단순한 예로 이해하면 된다.
      </p>

      <h4>그렇다면 본문에서는 왜 이 예가 필요할까?</h4>
      <p>
        칸토어 집합에는 무수히 많은 점이 남지만, 그 점들 사이를 연속해서
        이어주는 선분은 남지 않는다. 남은 점 주변을 아무리 작게 들여다봐도,
        집합에 속하는 점과 제거된 틈을 다시 만나게 된다.
      </p>
      <p>
        예를 들어 1/3은 집합에 속하지만, 그 바로 오른쪽에는 처음에 제거한 빈틈이
        있다. 따라서 집합 위의 점에서 아주 조금 움직였다는 사실만으로, 옮긴 점도
        여전히 집합에 속한다고 할 수는 없다.
      </p>
      <p>
        본문에서 떠올리려는 것은 이런 기하학적 제약이다. 상태들이 놓이는 집합이
        전체 공간을 채우지 않는다면, 변수 값을 조금 바꾼 조합이 그 집합 바깥에
        놓일 수도 있다. 다만 칸토어 집합이 이런 구조를 보여준다는 사실과, 실제
        우주의 상태들이 같은 방식으로 제한된다는 가설은 별도로 검토해야 한다.
      </p>
    </div>
  );
}

function Bloch() {
  const [theta, setTheta] = useState(90);
  const [phi, setPhi] = useState(0);
  const v = bloch(theta, phi);
  const tilt = (20 * Math.PI) / 180;
  const turn = Math.PI / 6;
  // Orthographic projection with perpendicular screen axes preserves the silhouette.
  const project = (x: number, y: number, z: number) => [
    260 + 110 * (Math.cos(turn) * x + Math.sin(turn) * y),
    155 +
      110 *
        (-Math.sin(turn) * Math.sin(tilt) * x +
          Math.cos(turn) * Math.sin(tilt) * y -
          Math.cos(tilt) * z),
  ];
  const curve = (point: (t: number) => number[]) =>
    Array.from({ length: 97 }, (_, i) => {
      const [x, y, z] = point((i / 96) * 2 * Math.PI);
      const [px, py] = project(x, y, z);
      return `${i ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
    }).join(" ");
  const sphere = (t: number, p: number, interactive: boolean) => {
    const state = bloch(t, p);
    const [px, py] = project(state.x, state.y, state.z);
    const radius = Math.sin((t * Math.PI) / 180);
    const marker = interactive ? "bloch-live-arrow" : "bloch-overview-arrow";
    return (
      <svg
        viewBox="0 0 520 310"
        role="img"
        aria-label={
          interactive
            ? `순수 상태의 블로흐 구면. 세타 ${t}도, 파이 ${p}도. Z축의 0 확률 ${(state.p0 * 100).toFixed(1)}퍼센트, X축의 플러스 확률 ${((1 + state.x) * 50).toFixed(1)}퍼센트`
            : "블로흐 구면의 구조. 북극은 0, 남극은 1, 적도의 X축 양쪽은 플러스와 마이너스 상태다. 중심에서 뻗은 화살표 끝이 순수 상태 하나를 가리킨다"
        }
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <circle cx="260" cy="155" r="110" fill="none" stroke="#d4d4d8" />
        <path
          d={curve((a) => [Math.cos(a), Math.sin(a), 0])}
          className="cn-guide"
        />
        <path
          d={curve((a) => [Math.cos(a), 0, Math.sin(a)])}
          fill="none"
          stroke="#e4e4e7"
        />
        {[
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ].map(([x, y, z], i) => {
          const [ax, ay] = project(x, y, z);
          const [bx, by] = project(-x, -y, -z);
          return (
            <line key={i} x1={ax} y1={ay} x2={bx} y2={by} className="cn-axis" />
          );
        })}
        {interactive && radius > 0.001 && (
          <path
            d={curve((a) => [
              radius * Math.cos(a),
              radius * Math.sin(a),
              state.z,
            ])}
            fill="none"
            stroke="#71717a"
            strokeDasharray="3 4"
          />
        )}
        <text x="270" y="32">
          +Z · |0⟩
        </text>
        <text x="270" y="290">
          −Z · |1⟩
        </text>
        <text x="369" y="129">
          +X · |+⟩
        </text>
        <text x="68" y="191">
          −X · |−⟩
        </text>
        <text x="329" y="210">
          +Y
        </text>
        <line
          x1="260"
          y1="155"
          x2={px}
          y2={py}
          className="cn-vector"
          markerEnd={`url(#${marker})`}
        />
        <circle cx={px} cy={py} r="4" className="cn-dot" />
        {!interactive && (
          <text x={px + 12} y={py - 12}>
            |ψ⟩
          </text>
        )}
      </svg>
    );
  };
  const atPole = theta === 0 || theta === 180;
  const isPlus = theta === 90 && phi % 360 === 0;
  const isMinus = theta === 90 && phi === 180;

  return (
    <div className="cn-lesson">
      <p>
        앞서 살펴본 힐베르트 공간과 기저 벡터가 여기서 연결된다. 특히 본문에
        등장한 팀 팔머의 불변집합이론을 이해할 때도 필요한 개념이다. 먼저 구면
        위의 점이 무엇을 뜻하는지부터 보자.
      </p>

      <h4>구면으로 양자 상태를 표현한다고?</h4>
      <figure className="cn-lesson-figure">
        {sphere(55, 35, false)}
        <figcaption>
          구의 중심에서 뻗은 화살표가 상태 |ψ⟩를 가리킨다. 실제 입자의 위치나
          이동 경로가 아니라 양자 상태를 나타낸 그림이다.
        </figcaption>
      </figure>
      <p>
        위 그림을 보면 구의 중심에서 어느 한 방향으로 화살표가 뻗어 있다. 이
        화살표가 가리키는 방향이 큐비트의 상태를 나타낸다. 여기서 큐비트는 |0⟩과
        |1⟩이라는 두 기저 상태로 기술하는 양자계다.
      </p>
      <p>
        대표적인 상태부터 살펴보자. 아래의 확률은 모두 Z축을 따라 측정한 경우다.
      </p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">구면 위치</th>
              <th scope="col">상태</th>
              <th scope="col">Z축 측정 결과</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">북극 (+Z)</th>
              <td>|0⟩</td>
              <td>0이 100%</td>
            </tr>
            <tr>
              <th scope="row">남극 (−Z)</th>
              <td>|1⟩</td>
              <td>1이 100%</td>
            </tr>
            <tr>
              <th scope="row">적도 (+X)</th>
              <td>|+⟩</td>
              <td>0과 1이 각각 50%</td>
            </tr>
            <tr>
              <th scope="row">적도 (−X)</th>
              <td>|−⟩</td>
              <td>0과 1이 각각 50%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        여기서 이상한 점이 있다. 적도의 서로 반대편에 있는 |+⟩와 |−⟩가 모두
        50:50의 확률을 갖는다. 그런데 두 상태는 서로 다르다. 같은 확률이
        나오는데 어떻게 다른 상태일 수 있을까? 이것이 블로흐 구면을 이해하는
        핵심이다.
      </p>

      <h4>양자 상태에는 확률 외에 위상이 있다</h4>
      <p>앞서 살펴본 것처럼 큐비트의 상태는 다음과 같이 표현할 수 있다.</p>
      <Equation name="bloch-state" />
      <p>α와 β는 복소수 계수이며, 정규화된 상태라면 다음 조건을 만족한다.</p>
      <Equation name="bloch-normalization" />
      <p>
        이 계수의 절댓값을 제곱하면 Z축 측정 확률을 얻는다. 하지만 복소수에는
        크기뿐 아니라 위상도 있다. 두 계수 사이의 위상 차이를 상대 위상이라고
        한다. 계수의 크기가 같아도 이 차이는 달라질 수 있다.
      </p>
      <p>
        두 계수에 똑같이 곱해진 전체 위상(Global Phase)은 측정 결과로 구별할 수
        없다. 이 중복을 제외하면 상태를 다음과 같이 다시 표현할 수 있다.
      </p>
      <Equation name="bloch" />
      <p>복잡해 보여도 상태를 정하는 변수는 두 각도다.</p>
      <ul>
        <li>
          θ(세타): 북극에서 얼마나 내려왔는지를 나타낸다. Z축 측정 확률과
          연결된다.
        </li>
        <li>
          φ(파이): Z축 둘레를 얼마나 돌았는지를 나타낸다. 두 기저 상태 사이의
          상대 위상이다.
        </li>
      </ul>
      <p>
        이 두 각도로 임의의 단일 큐비트 순수 상태를 나타낼 수 있다. θ가 같으면
        구면에서의 높이도 같고, Z축 측정 확률도 같다. φ를 바꾸면 그 높이를
        유지한 채 구 둘레를 돌게 된다.
      </p>
      <Equation name="bloch-probabilities" />
      <p>
        식의 e 항은 크기가 1인 채 위상만 바꾸는 계수다. φ가 0°이면 +1, 180°이면
        −1이 된다. 따라서 두 계수의 크기를 그대로 두고도 상대 부호를 바꿀 수
        있다. 이것이 앞의 두 적도 상태를 구별하는 차이다.
      </p>

      <h4>직접 각도를 바꿔보자</h4>
      <p>
        아래에서는 θ와 φ를 조절해 준비하는 상태를 바꾼다. 비교에 쓰는 Z축과 X축
        측정은 고정되어 있다. X축의 두 결과는 +와 −로 적겠다.
      </p>
      <p className="cn-task" id="bloch-task">
        먼저 ‘북극 |0⟩’, ‘적도 |+⟩’, ‘남극 |1⟩’을 차례로 선택해 Z축 확률을 보자.
        다음에는 ‘적도 |+⟩’와 ‘적도 |−⟩’를 번갈아 선택해보자. Z축은 계속
        50:50인데 X축은 어떻게 달라지는지 비교해보자.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="블로흐 상태 비교"
        aria-describedby="bloch-task"
      >
        {[
          { t: 0, p: 0, label: "북극 |0⟩" },
          { t: 90, p: 0, label: "적도 |+⟩" },
          { t: 90, p: 180, label: "적도 |−⟩" },
          { t: 180, p: 0, label: "남극 |1⟩" },
        ].map(({ t, p, label }) => (
          <button
            type="button"
            key={label}
            aria-pressed={theta === t && (atPole || phi % 360 === p)}
            onClick={() => {
              setTheta(t);
              setPhi(p);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cn-controls cn-angle-controls">
        <label className="cn-slider">
          북극에서 내려온 각도 θ <output>{theta}°</output>
          <input
            aria-label="블로흐 구면 극각"
            aria-describedby="bloch-task"
            type="range"
            min="0"
            max="180"
            value={theta}
            onChange={(e) => setTheta(+e.target.value)}
          />
        </label>
        <label className="cn-slider">
          Z축 둘레를 돈 각도 φ <output>{phi}°</output>
          <input
            aria-label="블로흐 구면 방위각"
            aria-describedby="bloch-task"
            type="range"
            min="0"
            max="360"
            value={phi}
            onChange={(e) => setPhi(+e.target.value)}
          />
        </label>
      </div>
      <figure className="cn-lesson-figure">
        {sphere(theta, phi, true)}
        <figcaption>
          화살표 끝은 준비한 순수 상태다. 점선 원은 같은 θ를 갖는 상태들을
          잇는다. 3차원 구를 평면에 옮겼으므로, 표면의 점도 그림에서는 원 테두리
          안쪽에 보일 수 있다.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {atPole
            ? "극점에서는 φ를 돌려도 같은 상태다. 북극은 Z축에서 0만, 남극은 1만 나온다."
            : isPlus
              ? "|+⟩ 상태다. Z축에서는 0과 1이 반반이지만, X축에서는 +가 100% 나온다."
              : isMinus
                ? "|−⟩ 상태다. Z축에서는 여전히 반반이지만, X축에서는 −가 100% 나온다."
                : "θ를 고정하고 φ만 바꿔보자. Z축 확률은 유지되지만 X축 확률은 달라질 수 있다."}
        </span>
        <div className="cn-probabilities">
          <div>
            <span>Z축 측정</span>
            <span>
              0: {(v.p0 * 100).toFixed(1)}% · 1: {(v.p1 * 100).toFixed(1)}%
            </span>
            <div className="cn-probability-bar" aria-hidden="true">
              <i style={{ width: `${v.p0 * 100}%` }} />
            </div>
          </div>
          <div>
            <span>X축 측정</span>
            <span>
              +: {((1 + v.x) * 50).toFixed(1)}% · −:{" "}
              {((1 - v.x) * 50).toFixed(1)}%
            </span>
            <div className="cn-probability-bar" aria-hidden="true">
              <i style={{ width: `${(1 + v.x) * 50}%` }} />
            </div>
          </div>
        </div>
      </div>
      <p className="cn-caption">
        막대의 검은 부분은 첫 결과(0 또는 +), 회색 부분은 둘째 결과(1 또는 −)의
        확률이다. 각 측정의 확률은 같은 상태를 여러 번 새로 준비해 측정할 때의
        비율이다. 한 입자를 두 방향에서 동시에 측정하는 그림은 아니다.
      </p>
      <p>
        θ를 90°로 고정하고 φ를 0°에서 180°로 바꿔보면, 두 상태는 각각 다음과
        같다.
      </p>
      <Equation name="bloch-plus-minus" />
      <p>
        두 식에서 |0⟩과 |1⟩ 앞의 계수는 크기가 같다. 그래서 Z축으로 측정하면 둘
        다 반반이다. 하지만 이 두 상태는 바로 X축 측정의 기저 상태다. X축으로
        측정하면 첫째는 +가 확실히 나오고, 둘째는 −가 확실히 나온다.
      </p>
      <p>
        즉, 한 측정 기준에서의 확률만으로는 양자 상태를 전부 구별할 수 없다.
        상대 위상이 달라지면 다른 기준에서 측정할 확률도 달라질 수 있다. 같은
        크기의 진폭도 위상에 따라 더해지거나 상쇄되므로, 이 차이는 양자 간섭을
        이해하는 데도 중요하다.
      </p>

      <h4>왜 하필 구면일까?</h4>
      <p>
        이 부분은 앞서 살펴본 힐베르트 공간과 연결된다. 큐비트 하나는 2차원 복소
        힐베르트 공간의 상태 벡터로 표현된다.
      </p>
      <Equation name="bloch-column" />
      <p>
        복소수 두 개에는 실수 성분이 총 네 개 있다. 하지만 정규화 조건으로
        자유도 하나가 줄어들고, 관측으로 구별되지 않는 전체 위상을 제외하면
        독립적인 실수 매개변수는 두 개만 남는다. 그 둘을 θ와 φ로 표현하면 구면
        위의 한 점과 대응시킬 수 있는 것이다.
      </p>
      <p>
        구면의 높이 z는 cosθ이며, Z축에서 ‘0의 확률 − 1의 확률’에 해당한다. 두
        확률의 합은 1이므로 0의 확률은 (1 + cosθ)/2다. 반각 공식을 적용하면
        앞에서 본 cos²(θ/2)가 된다. 상태를 적는 식에 θ/2가 등장하는 이유다.
        힐베르트 공간 설명의 계수 평면에서 잰 각도와, 이 구면의 θ는 같은 각도가
        아니다.
      </p>
      <p>
        이 구는 물리적인 공간에 존재하는 구가 아니라 양자 상태를 나타내는 수학적
        지도다. 그리고 한 가지 더 구별할 것이 있다.
      </p>
      <ul>
        <li>구면 표면: 상태 벡터 하나로 지정하는 순수 상태(Pure State).</li>
        <li>
          구면 내부: 서로 다른 순수 상태를 확률적으로 섞은 혼합 상태(Mixed
          State).
        </li>
        <li>정확한 중심: 두 기저 상태를 반반씩 섞은 완전 혼합 상태 I/2.</li>
      </ul>
      <p>
        예를 들어 |0⟩ 또는 |1⟩을 각각 50%의 확률로 골라 준비한 경우는 중심에
        놓인다. 이것은 적도의 순수 상태 |+⟩와 다르다. Z축에서는 둘 다
        반반이지만, X축에서 중심의 혼합 상태는 여전히 반반이고 |+⟩는 +가 100%
        나온다. 따라서 중첩 상태와 확률적으로 섞은 상태도 구별해야 한다.
      </p>
      <p>
        혼합 상태까지 포함한 구 전체를 블로흐 볼(Bloch Ball)이라고 부르기도
        한다. 위 조작은 구면 표면의 순수 상태를 다룬다. 평면 그림에서 표면의
        점이 원 테두리 안쪽에 보이는 것과, 실제로 구 내부의 혼합 상태라는 것은
        다른 말이다.
      </p>

      <h4>그럼 팔머의 불변집합이론에서는 왜 이 구면을 사용할까?</h4>
      <p>
        이제 본문과 가장 직접적으로 연결되는 부분을 보자. 통상적인
        양자역학에서는 블로흐 구면 표면의 모든 점이 수학적으로 허용되는 순수
        큐비트 상태다. 그런데 팔머는 그보다 근본적인 상태 공간에 추가적인
        기하학적 제약이 있다고 가정한다.
      </p>
      <p>
        팔머의 모형은 블로흐 구면의 상태 표현을 유한한 길이의 비트열, 이산화된
        각도, 프랙탈 불변집합과 연결한다. 여기서 중요한 생각은 일반 양자역학으로
        수학적으로 표현할 수 있는 상태라고 해서, 그가 가정한 근본적인 상태
        공간에서도 모두 실현 가능하지는 않을 수 있다는 것이다.
      </p>
      <p>
        그렇다면 입자의 숨은 상태는 그대로 둔 채 ‘측정 조건만 다르게 했다면?’
        이라는 질문도 다시 검토하게 된다. 그 변경으로 만든 상태의 조합이 모형의
        불변집합 안에 여전히 놓이는지를 먼저 물어야 하기 때문이다.
      </p>
      <p>
        다만 블로흐 구면 자체가 프랙탈이라는 뜻은 아니다. 이 구면은 표준적인
        양자 상태의 표현이고, 팔머의 이산화와 불변집합 구조는 여기에 별도로
        제안된 가설이다. 실제 자연이 그 제약을 따른다고 실험적으로 확립된 것은
        아니다.
      </p>
      <p>
        지금까지의 개념을 연결하면, 힐베르트 공간은 양자 상태를 표현하는 수학적
        공간이고 기저 벡터는 그 상태를 표현하는 기준이다. 블로흐 구면은 그중
        단일 큐비트의 상태를 3차원 그림으로 옮겨 보여주는 도구다. 팔머의 연구는
        우리가 쓰는 상태의 수학적 표현과, 실제 세계가 가질 수 있는 근본적인 상태
        사이에 어떤 차이가 있을지를 묻는 시도인 것이다.
      </p>
    </div>
  );
}

const content = {
  epr: Epr,
  bell: Bell,
  chsh: Chsh,
  guiding: Guiding,
  hilbert: Hilbert,
  attractor: Attractor,
  cantor: Cantor,
  bloch: Bloch,
};

export default function ConceptNote({
  topic,
  math,
}: {
  topic: Topic;
  math: Record<string, string>;
}) {
  const info = meta[topic];
  const Content = content[topic];
  return (
    <details className="concept-note not-prose" id={`concept-${topic}`}>
      <summary>
        <span className="cn-expand" aria-hidden="true">
          ＋
        </span>
        <span className="cn-summary-copy">
          <span className="cn-title">{info.title}</span>
          <span className="cn-summary-description">{info.subtitle}</span>
        </span>
      </summary>
      <div className="cn-body">
        <p className="cn-lead">{info.lead}</p>
        <MathContext.Provider value={math}>
          <Content />
        </MathContext.Provider>
        <footer className="cn-sources">
          <span>더 읽기</span>
          {info.sources.map(([label, href]) => (
            <a key={href} href={href}>
              {label} ↗
            </a>
          ))}
        </footer>
      </div>
    </details>
  );
}
