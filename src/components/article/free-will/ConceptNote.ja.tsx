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
    title: "EPR論文",
    subtitle: "予測が当たることと、説明が完全であること",
    lead: "EPRは、Einstein・Podolsky・Rosenという3人の著者の姓を並べた略称だ。論文が問うたのは、「量子力学の記述は、物理的実在を漏れなく捉えているのか」ということだった。",
    sources: [["1935年のEPR論文", "https://doi.org/10.1103/PhysRev.47.777"]],
  },
  bell: {
    title: "ベルの不等式",
    subtitle: "箱の中のコインという説明は、測定方向を変えても成り立つだろうか",
    lead: "ベルの不等式は、自然を古典的な因果関係だけで説明できるかを試す数学的な条件だ。離れた2つの粒子が、あらかじめ持っていた情報だけで答えるなら、2つの結果の関係には超えられない限界が生まれる。",
    sources: [
      ["Bell, 1964", "https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195"],
      ["CHSH, 1969", "https://doi.org/10.1103/PhysRevLett.23.880"],
      ["Hensenほか、2015年", "https://arxiv.org/abs/1508.05949"],
    ],
  },
  chsh: {
    title: "CHSH不等式",
    subtitle: "事前に決めた答えはなぜ75%が限界で、量子もつれでは何が違うのか",
    lead: "CHSH不等式はベルの不等式の一種だ。2つの粒子が、あらかじめ持っていた局所的な情報だけで応答するという説明を、実験で検証できる形にする。興味深いのは、量子力学では実際にその限界を超えることだ。",
    sources: [
      ["CHSH論文", "https://doi.org/10.1103/PhysRevLett.23.880"],
      [
        "IBM Quantum · CHSHゲーム",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/chsh-game",
      ],
    ],
  },
  guiding: {
    title: "ガイディング方程式",
    subtitle: "現在の波動関数と位置が、その後の動きを決める仕組み",
    lead: "ド・ブロイ＝ボーム理論のガイディング方程式（Guiding Equation）は、粒子が実際の位置と軌道を持ち、その運動が波動関数によって決まるという考えを数学で表したものだ。",
    sources: [
      [
        "Berndlほか · A Survey on Bohmian Mechanics",
        "https://arxiv.org/abs/quant-ph/9504010",
      ],
      [
        "Goldstein · Bohmian Mechanics",
        "https://plato.stanford.edu/entries/qm-bohm/",
      ],
    ],
  },
  hilbert: {
    title: "ヒルベルト空間と基底ベクトル",
    subtitle: "同じ状態でも、基準によって表し方が変わる理由",
    lead: "ヒルベルト空間（Hilbert Space）と基底ベクトル（Basis Vector）は、量子力学を理解するうえで重要な概念だ。",
    sources: [
      [
        "IBM Quantum · 状態ベクトルと基底",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM Quantum · 複数の粒子の状態ともつれ",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/multiple-systems/quantum-information",
      ],
      ["’t Hooft · セル・オートマトン解釈", "https://arxiv.org/abs/1405.1548"],
      [
        "MIT · 内積と完備性（72ページ）",
        "https://ocw.mit.edu/courses/18-102-introduction-to-functional-analysis-spring-2021/8fb8d5c170f1613151aca71de21027bc_MIT18_102s21_full_lec.pdf#page=72",
      ],
    ],
  },
  attractor: {
    title: "アトラクターとストレンジアトラクター",
    subtitle: "同じ構造に集まっても、なぜ長期予測は難しいのか",
    lead: "アトラクター（Attractor）とストレンジアトラクター（Strange Attractor）は、決定論と予測可能性が同じではないことを理解する助けになる。",
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
        "MIT · ストレンジアトラクター",
        "https://ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec19.pdf",
      ],
      [
        "MIT · ローレンツ方程式",
        "https://live.ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec20-21.pdf",
      ],
    ],
  },
  cantor: {
    title: "フラクタルとカントール集合",
    subtitle: "長さは0でも点は残り、小さな部分に全体と同じ構造が現れる",
    lead: "カントール集合（Cantor Set）は、線分の中央の3分の1を取り除く操作を無限に繰り返して作るフラクタルの一例だ。複雑な図を使わずに、小さな部分に全体と同じ構造が現れるとはどういうことかを考えられる。",
    sources: [
      [
        "Shuyi Weng · カントール集合の構成（2.2節）",
        "https://e.math.cornell.edu/people/belk/projects/ShuyiWeng.pdf",
      ],
      [
        "Scott Sutherland · カントール集合と自己相似性",
        "https://www.math.stonybrook.edu/~scott/papers/Book331/Cantor_sets.html",
      ],
    ],
  },
  bloch: {
    title: "ブロッホ球面",
    subtitle: "同じ50:50の確率でも、異なる量子状態を表すことがある",
    lead: "ブロッホ球面（Bloch Sphere）は、1つの量子ビットの純粋な量子状態を、3次元の球面上の点として可視化する数学的な道具だ。",
    sources: [
      [
        "IBM Quantum · ブロッホ球面",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM · 位相と球面から状態を読む",
        "https://quantum.cloud.ibm.com/docs/en/guides/composer",
      ],
      [
        "IBM Quantum · 純粋状態とブロッホボール",
        "https://quantum.cloud.ibm.com/learning/en/courses/general-formulation-of-quantum-information/density-matrices/bloch-sphere",
      ],
      [
        "Palmer · ブロッホ球面の離散化（2020年）",
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
        量子力学が実験結果をうまく予測することと、それが自然の完全な説明であることは同じだろうか。実際に存在する性質を理論が捉えていなければ、予測が正しくても、説明にはまだ欠けた部分があるかもしれない。3人が疑問を投げかけたのはこの点だった。
      </p>
      <p>
        2つの粒子が相互作用したあと、遠く離れたと考えてみよう。EPRが扱った理想的な状態では、2つの粒子の位置の差と運動量の和が決まっている。そのため、一方の位置を測れば他方の位置を計算でき、一方の運動量を測れば他方の運動量を計算できる。
      </p>
      <p>
        ここで局所性を受け入れるなら、こちらで何を測るかによって、遠くの粒子の実際の状態が即座に変わることはないはずだ。相手の粒子を変えていないのに、その値を確実に知れるなら、その値は測定で新しく生じたのではなく、もともと粒子が持っていた性質と考えられないだろうか。これがEPRの示した実在の判断基準だった。
      </p>
      <p>
        次に、私が位置と運動量のどちらを測るか選ぶとしよう。位置を選べば、相手の粒子はすでに定まった位置を持つと考える。運動量を選べば、すでに定まった運動量を持つと考える。実際に測るのはどちらか一方だ。しかし、遠くの粒子がどんな性質を持つかが私の選択に左右されないなら、その粒子は両方の値を持っていなければならない、というのがEPRの考えだった。
      </p>
      <p>
        ところが、量子力学の波動関数では、1つの粒子の位置と運動量を同時に正確な値で指定できない。先ほどの考えに従えば、実際の粒子は両方の値を持つのに、波動関数にはその情報がすべて含まれていないことになる。そこで3人は、波動関数だけでは物理的実在を完全に記述できないと結論づけた。
      </p>
      <p>
        ただし、この結論には、離れた粒子は私の測定で即座には変わらないという局所性と、確実に予測できる値は実際の性質と見なすべきだという判断が、一緒に含まれている。のちのベルの定理は、局所的な説明を保ちながら、量子力学が予測する相関をすべて再現できるか、という問いから出発する。
      </p>
    </>
  );
}

function Bell() {
  return (
    <div className="cn-lesson">
      <p>
        1964年にジョン・スチュワート・ベルが提案し、1969年にはCHSHが、より広く実験に使える形へと発展させた。まず、なぜこのような不等式が必要だったのかを見てみよう。
      </p>

      <h4>箱の中のコインで説明できるだろうか</h4>
      <p>
        2枚のコインを、一方は表、もう一方は裏にして、それぞれ箱に入れたと考えてみよう。その状態が変わらないようにして、一方の箱を地球に置き、もう一方を火星に送る。
      </p>
      <p>地球で箱を開けたら、表だったとしたら？</p>
      <p>
        火星の箱を開けなくても、そちらは裏だとわかる。{" "}
        <strong>箱を開ける前から、2つの結果が決まっていたからだ。</strong>
      </p>
      <p>
        アインシュタインは、量子もつれもこのように説明できるのではないかと考えた。粒子は初めから私たちの知らない情報を持ち、それに応じて測定結果が出るという考えだ。この追加の情報を「隠れた変数」と呼ぶ。
      </p>
      <p>しかしベルは、ここでもう1つ問いを投げかけた。</p>
      <blockquote>
        <p>
          粒子が事前に持っていた情報で答え、離れた相手の測定の選び方がその答えを変えないなら、必ず守らなければならない数学的な規則があるのではないか。
        </p>
      </blockquote>
      <p>そして実際に、その規則を見つけた。</p>

      <h4>3つの方向でスピンを測ってみよう</h4>
      <p>
        もつれた2つのスピン1/2粒子を、アリスとボブに1つずつ送るとする。ここでは、{" "}
        <strong>同じ方向で測ると必ず反対の結果が出る状態</strong>
        を使う。全スピンが0の一重項状態で、次のように書ける。
      </p>
      <Equation name="bell-singlet" />
      <p>
        それぞれが下の3方向から1つを選び、自分の粒子を測る。結果は+1か−1だ。
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 265"
          role="img"
          aria-label="測定方向Aは0度、Bは60度、Cは120度。AとB、BとCの角度差はそれぞれ60度、AとCは120度。"
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
        <figcaption>A–BとB–Cは60°、A–Cは120°離れている。</figcaption>
      </figure>
      <p>
        局所的な隠れた変数で説明するなら、粒子は各方向の問いにどう答えるかを、あらかじめ決めていると考えられる。たとえば、次のような回答表がありうる。
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>事前に決められた回答表の一例</caption>
          <thead>
            <tr>
              <th scope="col">測定方向</th>
              <th scope="col">アリスの粒子</th>
              <th scope="col">ボブの粒子</th>
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
        同じ方向を尋ねれば必ず反対になるので、ボブの答えはアリスと反対だ。ほかの回答表も考えられるが、どの場合も、3つの問いへの答えが1つの矛盾のない表を作らなければならない。
      </p>

      <h4>この回答表には避けられない制約がある</h4>
      <p>
        まずアリスの答えだけを見よう。AとCの答えが違うなら、次の少なくとも一方は必ず成り立つ。
      </p>
      <ul>
        <li>AとBの答えが違う。</li>
        <li>BとCの答えが違う。</li>
      </ul>
      <p>
        AとBが同じで、BとCも同じなら、AとCも同じになるしかないからだ。上の表でもAとCは違い、間のBはAと同じでCとは違う。
      </p>
      <p>
        こうした回答表をたくさん集めても同じだ。AとCが違う場合は、必ず残り2つの場合の少なくとも一方に含まれる。その確率は、2つの確率の和を超えられない。
      </p>
      <Equation name="bell-answers" />
      <p>
        この式のA、B、Cは、アリス側の粒子が各方向について事前に決めている答えだ。1つの粒子を実際に3方向で同時に測るという意味ではない。
      </p>
      <p>では、この関係を2粒子の実験でどう確かめるのだろうか。</p>
      <p>
        上の表では、アリスのAは+1、Cは−1で、ボブのCは+1だ。したがって「アリスのAとCが違う」は、「アリスにA、ボブにCを尋ねると2つの答えが同じになる」と言い換えられる。
      </p>
      <p>
        同じ方向なら2人の答えが反対になるという条件をほかの組にも使うと、実際の測定記録を比べる不等式が得られる。
      </p>
      <Equation name="bell-bound" />
      <p>
        Pの「一致」は、2人が同じ結果を得る確率を表す。毎回新しい粒子対で実験し、測定方向の選択は粒子の隠れた情報から独立だと仮定する。この条件では、事前回答のモデルは必ず上の関係を守る。
      </p>

      <h4>ところが、量子力学はこの限界を超える</h4>
      <p>
        先ほど用意した一重項状態|Ψ⁻⟩を量子力学で計算してみよう。2つの測定方向の角度差をθとすると、この状態で結果が一致する確率は次のようになる。
      </p>
      <Equation name="bell-quantum" />
      <p>先ほどの3方向を代入すると、次のようになる。</p>
      <div className="cn-table-wrap">
        <table>
          <caption>量子力学が予測する確率</caption>
          <thead>
            <tr>
              <th scope="col">測定方向</th>
              <th scope="col">角度差</th>
              <th scope="col">結果が一致する確率</th>
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
      <p>
        これらの数値が先ほどの不等式を満たすには、次の関係が成り立つ必要がある。
      </p>
      <div className="cn-lesson-result">
        <Equation name="bell-substitution" />
        <p>
          <strong>しかし0.75は0.50より大きい。この関係は成り立たない。</strong>
        </p>
      </div>
      <p>
        これがベル不等式の破れの核心だ。事前の回答表をどのように作り、どんな割合で混ぜても、この3つの確率を同時には再現できない。ところが量子力学は、このような相関が可能だと予測する。
      </p>

      <h4>では、自然について何がわかったのだろうか</h4>
      <p>
        不等式が破れたからといって、すぐに「測定前には何も決まっていない」とは結論できない。正確には、次の条件をすべて守る説明では、観測された相関を再現できないということだ。
      </p>
      <ul>
        <li>
          <strong>局所的因果性。</strong>{" "}
          それぞれの場所での測定結果と2つの結果の関係を、その場所の原因と、共通の過去にあった情報で説明する。
        </li>
        <li>
          <strong>測定選択の独立性。</strong>{" "}
          どの方向で測るかという選択は、粒子に与えられた隠れた変数から統計的に独立している。
        </li>
        <li>測定では記録できる結果が得られ、通常の確率の規則を適用する。</li>
      </ul>
      <p>
        どの条件を維持し、どれを変えるかは別の問題だ。非局所的な決定論的解釈も存在し、不等式の破れによって光より速い通信が可能になるわけでもない。
      </p>
      <p>
        興味深いのは、「私たちがまだ答えを知らないだけ」という説明にも、実験で確かめられる限界が生まれたことだ。隠れた情報があるという考えそのものよりも、{" "}
        <strong>
          その情報が局所的に働きながら、すべての量子的な相関を説明できるのか
        </strong>
        が問題なのである。
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
        名前は、1969年の論文の4人の著者、Clauser・Horne・Shimony・Holtに由来する。
      </p>

      <h4>ベルの不等式からCHSHへ</h4>
      <p>
        先ほどのベルの例では、同じ方向で測ると結果が完全に反対になるという条件を使った。1969年のCHSH不等式は、この条件がなくても検証できるようにベルの議論を拡張した。
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">比較</th>
              <th scope="col">先ほどのベル不等式の例</th>
              <th scope="col">CHSH不等式</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">測定の選択肢</th>
              <td>3方向A、B、C</td>
              <td>各観測者に2方向</td>
            </tr>
            <tr>
              <th scope="row">同じ方向での結果</th>
              <td>必ず反対だと仮定する</td>
              <td>その条件がなくても適用できる</td>
            </tr>
            <tr>
              <th scope="row">検証するもの</th>
              <td colSpan={2}>局所的な隠れた変数で説明できる相関の限界</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        CHSHは別の現象ではなく、同じ問題をより広く実験できる形にしたものだ。実際の実験でも、こうした局所的モデルの限界を超える結果が観測されている。
      </p>

      <p>なぜこのような限界が生まれるのか、ごく簡単なゲームで考えてみよう。</p>

      <h4>2人に質問するゲーム</h4>
      <p>
        アリスとボブという2人がいるとする。2人は遠く離れていて、ゲーム中には連絡を取り合えない。ただし、始まる前なら自由に作戦を立てられる。
      </p>
      <p>それぞれが、2つの質問のうち1つを無作為に受け取る。</p>
      <ul>
        <li>アリスにはA₀かA₁</li>
        <li>ボブにはB₀かB₁</li>
      </ul>
      <p>
        質問を受けたら、 <strong>0か1で答えなければならない。</strong>{" "}
        自分の質問だけがわかり、相手がどの質問を受けたかはわからない。
      </p>
      <p>勝つための規則は次のとおりだ。</p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">アリスへの質問</th>
              <th scope="col">ボブへの質問</th>
              <th scope="col">勝利条件</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A₀</td>
              <td>B₀</td>
              <td>2つの答えが同じ</td>
            </tr>
            <tr>
              <td>A₀</td>
              <td>B₁</td>
              <td>2つの答えが同じ</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₀</td>
              <td>2つの答えが同じ</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₁</td>
              <td>2つの答えが違う</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        4つの質問の組み合わせは同じ確率で選ばれ、その選択は2人が事前に共有した情報から独立している。
      </p>
      <p>
        ここで面白い問題が生じる。{" "}
        <strong>
          どんな答えを事前に決めても、4条件をすべて満たすことはできない。
        </strong>
      </p>

      <h4>なぜ最大でも75%しか勝てないのか</h4>
      <p>最初の条件を満たすには、A₀とB₀の答えが同じでなければならない。</p>
      <p>
        2番目の条件ではA₀とB₁が同じ、3番目ではA₁とB₀が同じでなければならない。
      </p>
      <p>
        下の図の実線3本をたどってみよう。結局、{" "}
        <strong>4つの質問への答えはすべて同じでなければならない。</strong>{" "}
        ところが最後の破線は、A₁とB₁の答えが違うことを求める。この2つの要求を同時には満たせない。
      </p>
      <figure className="cn-lesson-figure">
        <div
          className="cn-game-diagram"
          role="group"
          aria-label="CHSHの4つの質問について事前に決める答え"
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
              aria-label={`${i < 2 ? "アリス" : "ボブ"}の${name}の答え${answers[i]}、押して切り替え`}
              aria-pressed={answers[i] === 1}
              onClick={() =>
                setAnswers((current) =>
                  current.map((v, j) => (i === j ? 1 - v : v))
                )
              }
            >
              <span>{name}</span>
              <small>答え {answers[i]}</small>
            </button>
          ))}
        </div>
        <figcaption>
          実線：同じ答えが必要 · 破線：違う答えが必要
          <br />
          濃い線は、現在の回答表で失敗する組み合わせを表す。
        </figcaption>
      </figure>
      <p className="cn-task" id="chsh-task">
        4つの枠を押すと、答えが0と1の間で切り替わる。まず「A₁だけ1」を押してみよう。最後の条件を満たすと、失敗はどこへ移るだろうか。ほかの答えも変えて、4本の線すべてを満たせるか確かめてみよう。
      </p>
      <div className="cn-controls" role="group" aria-label="CHSHの回答例">
        <button type="button" onClick={() => setAnswers([0, 0, 0, 0])}>
          すべて0
        </button>
        <button type="button" onClick={() => setAnswers([0, 1, 0, 0])}>
          A₁だけ1
        </button>
      </div>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          4条件のうち {wins.filter(Boolean).length} 条件を達成 · 勝率{" "}
          {probability * 100}%
        </strong>
        <span className="cn-observation">
          失敗する組み合わせ： {pairs.filter((_, i) => !wins[i]).join(", ")}
        </span>
      </div>
      <p>
        実際のゲームでは、4つの組み合わせのうち1つだけが選ばれる。上の図は、同じ回答表を4つの場合すべてに当てはめたものだ。
      </p>
      <p>
        どの回答表を選んでも、少なくとも1条件では失敗する。4つの組み合わせが同じ確率で選ばれるなら、最善でも3/4、つまり{" "}
        <strong>75%</strong>の割合でしか勝てない。
      </p>
      <p>
        毎回違う回答表を使っても、事前に乱数を共有しても同じだ。どの回答表も75%を超えないので、それらを混ぜた平均も75%を超えられない。
      </p>

      <h4>ところが、量子力学では約85.4%が可能になる</h4>
      <p>
        今度は2人が事前の回答表の代わりに、もつれた粒子を1つずつ持っていると考えてみよう。
      </p>
      <p>
        それぞれが、受け取った質問に応じて自分の粒子を測る方向を選び、得られた結果で答える。このゲームの「質問」が測定方向、「答え」が測定結果に対応する。
      </p>
      <p>
        では、約85.4%という数値はどこから出てくるのだろうか。もつれた状態にもいくつか種類がある。先ほどのベルの例では、同じ方向で反対の結果が出る|Ψ⁻⟩を使ったが、このゲームでは次の|Φ⁺⟩状態を用意する。
      </p>
      <Equation name="chsh-state" />
      <p>
        ここからの測定軸は、すべてX–Z平面内で選ぶ。|Φ⁺⟩は、この平面で同じ方向に測ると同じ結果が出る状態だ。2本の測定軸の角度差をθとすると、この状態での確率は次のようになる。
      </p>
      <Equation name="chsh-probabilities" />
      <p>
        先ほどのsin²(θ/2)と、ここでのcos²(θ/2)が違うのは、用意したもつれの状態が違うからだ。θ=0°、つまり同じ方向では、先ほどの状態は必ず違う結果になり、今回の状態は上の平面内で必ず同じ結果になる。
      </p>
      <p>
        Z軸を0°とし、アリスの測定軸をA₀では0°、A₁では90°にしよう。ボブはB₀では45°、B₁では−45°にする。最初の3組は測定軸が45°離れ、最後の組だけ135°離れる。
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>スピン測定軸の角度と各組の勝利条件</caption>
          <thead>
            <tr>
              <th scope="col">質問の組み合わせ</th>
              <th scope="col">角度差</th>
              <th scope="col">勝利条件</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A₀ · B₀</th>
              <td>45°</td>
              <td>同じ答え</td>
            </tr>
            <tr>
              <th scope="row">A₀ · B₁</th>
              <td>45°</td>
              <td>同じ答え</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₀</th>
              <td>45°</td>
              <td>同じ答え</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₁</th>
              <td>135°</td>
              <td>違う答え</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        最初の3組は同じ答えが必要なので、最初の確率の式に45°を入れればよい。三角関数の半角公式で整理すると、次のようになる。
      </p>
      <Equation name="chsh-same" />
      <p>
        最後の組は違う答えが必要なので、2番目の式に135°を入れる。67.5°と22.5°の和は90°だから、この確率も先ほどと同じになる。
      </p>
      <Equation name="chsh-different" />
      <p>
        結局、 <strong>4組すべてで、約85.4%の確率で勝てる。</strong>{" "}
        4つの組み合わせはそれぞれ1/4の確率で選ばれるので、全体の勝率も、それらの平均である約85.4%になる。
      </p>
      <div
        className="cn-bars"
        role="img"
        aria-label="最大勝率の比較：古典的な局所戦略は75%、量子もつれを使う戦略は約85.4%"
      >
        <div>
          <span>古典的な局所戦略</span>
          <b>75.0%</b>
          <i style={{ width: "75%" }} />
        </div>
        <div>
          <span>量子もつれを使う戦略</span>
          <b>85.4%</b>
          <i style={{ width: `${(0.5 + Math.SQRT2 / 4) * 100}%` }} />
        </div>
      </div>
      <p>では、先ほどの論理が間違っていたのだろうか</p>
      <p>
        そうではない。先ほどは、尋ねなかった質問への答えも1つの表に事前に書いておけると仮定した。量子測定で得られる統計は、そうした局所的な回答表をいくら混ぜても再現できない、ということだ。
      </p>
      <p>
        上で操作した図は、事前回答の限界を示している。85.4%は、その図でもっとよい回答表を見つけて得た数値ではなく、量子力学の測定規則から計算した値だ。
      </p>

      <h4>このゲームを数式で表すとCHSH不等式になる</h4>
      <p>
        測定結果を0と1ではなく、+1と−1で表してみよう。2つの結果の積の平均をEとすると、同じ答えが多いほどEは+1に近づき、反対の答えが多いほど−1に近づく。
      </p>
      <p>
        添字は質問の組み合わせを表す。最初の3組は同じ答えが必要なので足し、最後の組は反対の答えが必要なので引く。
      </p>
      <Equation name="chsh" />
      <p>
        局所的な隠れた変数モデルでは、Sは2を超えられない。しかし量子力学では、次の値まで可能になる。
      </p>
      <Equation name="quantum" />
      <p>
        この上限を「チレルソン限界」と呼ぶ。ゲームで得られる{" "}
        <strong>最大勝率</strong>ともつながっている。
      </p>
      <Equation name="winning" />
      <p>
        局所戦略の上限2を入れると75%、量子戦略の上限2√2を入れると約85.4%になる。先ほどのゲームと不等式は、同じ限界を別の形で表している。
      </p>

      <h4>このゲームから自然について何がわかるのか</h4>
      <p>
        2つの粒子が事前に持っていた局所的情報だけで答え、測定の選択がその情報から独立なら、超えられない限界がある。実際の実験では、その限界を超える相関が観測されている。
      </p>
      <p>
        だからといって、光より速い通信が可能になったり、あらゆる決定論が間違いになったりするわけではない。どの前提を同時に維持できるかを考える必要がある。
      </p>
      <p>
        CHSHの面白さはここにある。{" "}
        <strong>
          「互いに事前に答えを合わせていただけ」という説明がどこまで通用するのか、数値で試せるようにしたこと。
        </strong>{" "}
        そして自然は、その説明が許す限界を超えるのである。
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
      <p>この理論が興味深いのは、次の3つを同時に主張することだ。</p>
      <ul>
        <li>粒子は測定前にも実際の位置を持っている。</li>
        <li>粒子の運動は根本的に決定論的である。</li>
        <li>
          それでも、量子平衡では通常の量子力学と同じ実験結果を予測できる。
        </li>
      </ul>
      <p>
        先ほどのベルの不等式を思い出すと、矛盾するように感じないだろうか。しかしベルの定理が排除するのは、あらゆる決定論ではなく、量子力学の相関を局所的な隠れた変数だけで説明できるという考えだ。ボーム理論は非局所性を明示的に受け入れるので、この結果と矛盾しない。
      </p>
      <p>
        この考えはド・ブロイが1927年に提案し、ボームが1952年に独立に再発見して体系化した。では、粒子の動きをどう決め、決定論的な運動からどう量子力学の確率が現れるのかを見てみよう。3つ目の主張に付いた「量子平衡」という条件にも、その過程で戻ってくる。
      </p>

      <h4>波動関数に、粒子の実際の位置を加える</h4>
      <p>
        通常の量子力学では、粒子の状態を波動関数ψで表す。この波動関数を使い、各位置で粒子を見つける確率を計算する。
      </p>
      <p>
        ド・ブロイ＝ボーム理論は、ここに <strong>粒子の実際の位置Q(t)</strong>
        を加える。粒子は測定したときだけある位置に見つかるのではなく、測定前にも実際にどこかにあると考えるのだ。
      </p>
      <p>
        波動関数と粒子の位置を区別して考えてみよう。波動関数はシュレーディンガー方程式に従って変化する。粒子の位置は、その波動関数から計算した速度に従って変化する。この2つ目の規則がガイディング方程式だ。
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">要素</th>
              <th scope="col">役割</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">波動関数ψ</th>
              <td>粒子の動き方を決める情報を持つ。</td>
            </tr>
            <tr>
              <th scope="row">実際の位置Q(t)</th>
              <td>時刻tに粒子が実際にどこにあるかを表す。</td>
            </tr>
            <tr>
              <th scope="row">ガイディング方程式</th>
              <td>波動関数と実際の位置から、その瞬間の速度を計算する。</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        重要なのは、波動関数を粒子の発見確率の計算に使うだけでなく、実際の運動まで決めることだ。ただし、粒子を押す水の波のように考えると正確ではない。波動関数は、各位置に複素数の値を対応させる数学的な対象だ。
      </p>

      <h4>ガイディング方程式は何を計算するのか</h4>
      <p>
        まず、スピンを持たない1個の粒子を考えよう。ここでは相対論的効果と磁場を除く。この場合のガイディング方程式は次のようになる。
      </p>
      <Equation name="guiding" />
      <p>
        記号が多く、複雑に見えるかもしれない。まず、この式が何を求めるのかを見よう。左辺のdQ/dtは粒子の速度だ。右辺は、その速度を波動関数と現在位置から計算する方法を示している。各記号の意味は次のとおりだ。
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">記号</th>
              <th scope="col">意味</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Q(t)</th>
              <td>時刻tにおける粒子の実際の位置</td>
            </tr>
            <tr>
              <th scope="row">dQ/dt</th>
              <td>粒子の位置が時間とともに変わる速度</td>
            </tr>
            <tr>
              <th scope="row">ψ</th>
              <td>波動関数</td>
            </tr>
            <tr>
              <th scope="row">∇ψ</th>
              <td>位置に応じて波動関数がどう変わるかを表す空間微分</td>
            </tr>
            <tr>
              <th scope="row">Im</th>
              <td>複素数から虚部を取り出す操作</td>
            </tr>
            <tr>
              <th scope="row">ℏ</th>
              <td>プランク定数hを2πで割った値</td>
            </tr>
            <tr>
              <th scope="row">m</th>
              <td>粒子の質量</td>
            </tr>
            <tr>
              <th scope="row">x=Q(t)</th>
              <td>右辺を、実際に粒子がある位置で計算するという意味</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        つまり、この式は、{" "}
        <strong>
          粒子がいまいる場所の波動関数を調べ、そこでの速度を計算する
        </strong>
        ということだ。
      </p>
      <p>
        なじみのあるニュートン力学と比べてみよう。ニュートンの運動方程式では、力から加速度を求める。
      </p>
      <Equation name="guiding-newton" />
      <p>
        ガイディング方程式は、加速度ではなく、{" "}
        <strong>速度そのものを直接決める。</strong>
        その速度に従って位置が変わり、次の位置では再びそこの波動関数から速度を計算する。したがって、初期位置と初期の波動関数、その変化の規則が与えられれば、その後の軌道が決まる。
      </p>
      <p>
        この式はψが0ではない場所で使う。ψ=0の場所では割り算をそのまま適用できないため、別途数学的な検討が必要になる。
      </p>

      <h4>波動関数を振幅と位相に分けてみよう</h4>
      <p>
        では、波動関数のどの情報が粒子の速度を決めるのだろうか。それを見るには、波動関数を2つの要素に分けるとよい。
      </p>
      <p>
        複素数は、平面上の点のように大きさと角度で表せる。波動関数でも、その大きさを振幅、角度を位相と呼ぶ。式にすると次のようになる。
      </p>
      <Equation name="guiding-phase" />
      <ul>
        <li>Rは波動関数の振幅だ。</li>
        <li>Sは位相を表す関数だ。この書き方では、実際の位相角はS/ℏになる。</li>
      </ul>
      <p>
        この表現をガイディング方程式に代入してみよう。まず、右辺の∇ψ/ψを計算すると2つの項に分かれる。
      </p>
      <Equation name="guiding-ratio" />
      <p>
        ガイディング方程式では、このうち虚部だけを取り出す。最初の∇R/Rは実数なので消え、後ろの項から∇S/ℏが残る。式の外側のℏ/mを掛けるとℏが約分され、速度の式は次のように整理される。
      </p>
      <Equation name="guiding-gradient" />
      <p>
        結局、粒子の速度を決めるのは、{" "}
        <strong>波動関数の位相が空間でどう変化するか</strong>
        である。∇Sは、同じ時刻に隣の位置へ移ったとき、Sがどれほど、どの方向に変わるかを表す。その勾配を質量で割った値が、現在位置での速度になる。
      </p>
      <p>
        ここでは、位相が大きいことと位相の勾配が大きいことを区別する必要がある。すべての位置の位相に同じ値を加えると、位相の値は変わるが、隣り合う位置の差は変わらない。したがって、勾配もその瞬間の速度も変わらない。
      </p>
      <p>
        1方向の簡単な例を見よう。振幅Aが一定の平面波は、次のように書ける。kは位相の位置に対する変化、ωは時間に対する変化の度合いを表す。
      </p>
      <Equation name="guiding-plane" />
      <p>
        先ほどの表現と比べると、この波動関数のSはℏ(kx−ωt)だ。xで微分するとℏkが残るので、速度は次のようになる。
      </p>
      <Equation name="guiding-plane-speed" />
      <p>
        この平面波の運動量はp=ℏkだから、古典力学でもなじみのある速度と運動量の関係が得られる。下の図で、位相の変化を直接比べてみよう。
      </p>
      <p className="cn-task" id="guiding-phase-task">
        まず勾配を「増加→一定→減少」と変えてみよう。速度の向きと大きさはどう変わるだろうか。次に勾配を固定し、全体の位相にπ/2を加えてみよう。グラフの高さが変わっても、速度は変わらないことがわかる。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="位相の空間勾配"
        aria-describedby="guiding-phase-task"
      >
        {[-1, 0, 1].map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={waveNumber === k}
            onClick={() => setWaveNumber(k)}
          >
            {k === -1 ? "減少 k=−1" : k === 0 ? "一定 k=0" : "増加 k=+1"}
          </button>
        ))}
      </div>
      <div
        className="cn-controls"
        role="group"
        aria-label="すべての位置に加える位相"
      >
        <button
          type="button"
          aria-pressed={phaseOffset === 0}
          onClick={() => setPhaseOffset(0)}
        >
          全体位相0
        </button>
        <button
          type="button"
          aria-pressed={phaseOffset !== 0}
          onClick={() => setPhaseOffset(Math.PI / 2)}
        >
          全体位相+π/2
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label={`位置xに対する位相のグラフ。勾配${waveNumber}、すべての位置に加えた位相${phaseOffset === 0 ? "0" : "2分のπ"}。速度は${waveNumber}.`}
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
            位相S/ℏ
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
            位置x
          </text>
        </svg>
        <figcaption>
          t=0での平面波の位相。単位はℏ=m=1とした。
          <br />
          点はx=0での位相の値。位相を加えたときは、元のグラフも破線で表示する。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          勾配k={waveNumber} · 速度v={waveNumber}
        </strong>
        <span className="cn-observation">
          {waveNumber === 0
            ? "位置に応じて位相が変わらないので、速度は0になる。"
            : waveNumber > 0
              ? "位置が増すほど位相も増すので、粒子はxが増加する方向へ動く。"
              : "位置が増すほど位相が減るので、粒子はxが減少する方向へ動く。"}
          {phaseOffset !== 0 &&
            " 全体の位相にπ/2を加えても、勾配と速度は変わらない。"}
        </span>
      </div>
      <p>
        だからといって、振幅Rが運動と無関係なわけではない。振幅と位相はシュレーディンガー方程式に従って一緒に変化する。速度の式に直接残るのが位相だけであることと、振幅がその後の運動に影響しないことは別の話だ。
      </p>

      <h4>粒子が片方のスリットしか通らなくても干渉縞はできるのか</h4>
      <p>
        二重スリットでは、粒子と波動関数の役割の違いがよりはっきりする。この理論では粒子に実際の位置があるので、2つのスリットのどちらか一方を通る。しかし両方が開き、どちらを通ったか記録しない実験では、波動関数は両方のスリットを通った成分の重ね合わせとして変化する。
      </p>
      <p>
        2つの成分が干渉すると、振幅と位相の空間的な形も変わる。粒子は、そうして変わった波動関数から計算される速度で動く。通ったスリットだけでその後の道筋が決まるのではなく、両方のスリットが作る波動関数全体が運動に関わる。
      </p>
      <p>
        実験を繰り返して到着位置を集めると、量子力学の干渉縞を得られる。ただし正確な統計を得るには、初期位置の分布についても説明する必要がある。
      </p>

      <h4>決定論的なのに、なぜ確率が現れるのか</h4>
      <p>
        1つの粒子の初期位置が決まれば、その経路も決まる。しかし実験では、その正確な位置を毎回知っているわけではない。繰り返した実験でどんな統計が現れるかを述べるには、初期位置がどう分布するかも与えなければならない。
      </p>
      <p>
        位置の確率密度をρとすると、通常の「量子平衡」では次の分布を使う。ψの絶対値を2乗して位置の確率密度を得る、ボルンの規則だ。
      </p>
      <Equation name="guiding-equilibrium" />
      <p>
        ガイディング方程式の重要な性質は、{" "}
        <strong>
          初めに位置が|ψ|²に従って分布していれば、その後も変化する|ψ|²に従って分布する
        </strong>
        ことだ。波動関数の変化と粒子の動きが、同じ位置の統計を保つ。この性質を同変性（equivariance）と呼ぶ。
      </p>
      <p>
        これはガイディング方程式に直接つながる。シュレーディンガー方程式から得られる確率の流れをjとすると、速度はその流れを密度|ψ|²で割った値になる。ψ*はψの複素共役を表す。
      </p>
      <Equation name="guiding-current" />
      <p>
        粒子がこの速度で動くため、位置分布の変化はシュレーディンガー方程式による確率の変化と一致する。測定装置も含めてこの関係を適用すると、非相対論的な量子平衡の範囲で、通常の量子力学の測定統計を再現する。
      </p>
      <p>
        ただし、どんな初期分布も自然に|ψ|²になるという意味ではない。なぜ量子平衡の分布を使うべきかは、別の統計的議論が必要だ。決定論的な運動法則を書いただけで、ボルンの規則まで自動的に証明されるわけではない。
      </p>

      <h4>ベルの不等式と矛盾しない理由</h4>
      <p>
        先ほどは、局所的な事前情報では量子力学の相関を説明できないと述べたのではなかったか。ボーム理論は決定論を維持するが、局所性は維持しない。その違いは粒子が2つある場合の式に現れる。
      </p>
      <p>
        多粒子の波動関数は、各粒子の位置をまとめて入力として受け取る。2粒子なら6つの位置座標が必要で、その可能な組み合わせ全体を「配置空間」と呼ぶ。この共同の波動関数で、1つ目の粒子の速度を計算してみよう。
      </p>
      <Equation name="guiding-pair" />
      <p>
        Ψは2粒子の位置をまとめて受け取る波動関数で、∇₁は1つ目の粒子の位置について空間微分するという意味だ。その速度を計算する式には、{" "}
        <strong>2つ目の粒子の実際の位置Q₂も入ってくる。</strong>
      </p>
      <p>
        波動関数が各粒子の関数に分離できれば相手の位置への依存は消えるが、もつれた状態では一般に分離できない。遠くの粒子の位置や、そこにある測定装置が、こちらの運動に関わることがある。これがこの理論の非局所性だ。
      </p>
      <p>
        ここで書いた式はスピンのない場合のものだ。CHSHのようにスピンを扱うには、波動関数を複数の複素数成分を持つスピノルへ拡張する。この理論は粒子の実際の位置を基本変数とするが、すべての方向のスピンの結果を、装置に依存しない事前回答として決めておくわけではない。測定結果は、粒子と装置を含む全体の相互作用によって決まる。
      </p>
      <p>
        また、量子平衡では、この非局所的依存を使って意図した超光速メッセージを送ることはできない。運動法則が離れた変数に依存することと、その依存を通信手段として制御できることは区別する必要がある。
      </p>

      <h4>量子ポテンシャルとは何か</h4>
      <p>
        ボームは同じ運動を「量子ポテンシャル」でも表現した。波動関数を振幅と位相に分けてシュレーディンガー方程式に代入すると、Sの変化の式に次の項が現れる。∇²Rは、振幅の空間的な曲がり具合を表す2階微分だ。
      </p>
      <Equation name="guiding-potential" />
      <p>
        古典力学で運動をエネルギーとSの変化によって書くハミルトン＝ヤコビ方程式に、この項を加えた形で整理できる。これは先ほどの2つの運動方程式を別の形で表したもので、独立した力や場を新たに仮定する必要があるという意味ではない。粒子の動きを理解するには、波動関数の変化とガイディング方程式だけでも十分だ。
      </p>

      <h4>では、この理論が正しいとわかったのだろうか</h4>
      <p>
        ここまでの説明が、実際の宇宙の運動の仕組みを確定するわけではない。非相対論的な量子平衡で通常の量子力学と同じ実験結果を出すということは、その結果だけでは両者を区別しにくいという意味でもある。相対性理論と組み合わせる拡張にも、さらに難しさがある。
      </p>
      <p>
        この考えが示すのは、量子力学の確率的な観測結果と決定論的な運動法則が、必ずしも矛盾しないことだ。ただし、運動を各粒子の周囲の原因だけで説明する代わりに、非局所的な依存を明示的に受け入れる。決定論を維持できることと、局所性まで同時に維持できることは同じ主張ではない。
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
        先ほどのド・ブロイ＝ボーム理論や波動関数、ベルの不等式も、ヒルベルト空間という数学的構造を使って説明できる。
      </p>
      <p>要点から整理すると、次のようになる。</p>
      <ul>
        <li>ヒルベルト空間：量子状態をベクトルで表すための数学的空間</li>
        <li>
          基底ベクトル：その空間で任意の状態を表すための基準となるベクトル
        </li>
        <li>
          波動関数：量子状態ベクトルを、ある基底で表したときに得られる表現の1つ
        </li>
      </ul>
      <p>1つずつ見てみよう。</p>

      <h4>まず基底ベクトルから考えよう</h4>
      <p>なじみのある2次元の座標平面を考えてみよう。</p>
      <p>
        2次元では、普通は次の2つを基底ベクトルとして使う。横に1単位のe₁と、縦に1単位のe₂だ。
      </p>
      <Equation name="hilbert-classical-basis" />
      <p>
        この2つがあれば、どんな2次元ベクトルも表せる。たとえばベクトル(5,
        4)は、次のように書ける。
      </p>
      <Equation name="hilbert-classical-vector" />
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 260"
          role="img"
          aria-label="横方向の基底e1を5倍、縦方向の基底e2を4倍して加え、ベクトル(5,4)を表す座標平面。"
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
          ベクトルは1つでも、2つの基底をどれだけずつ使うかで表せる。
        </figcaption>
      </figure>
      <p>
        つまり基底とは、組み合わせによって空間内のすべてのベクトルを表せるように選んだ、独立なベクトルの集まりだ。独立とは、どれか1つをほかの基底ベクトルの組み合わせで代用できないことをいう。
      </p>
      <p>
        基底ベクトルは必ずしも水平・垂直でなくてよい。平行でない2本を選んでも2次元空間を表せる。ただし、互いに直角で長さが1のベクトルを選ぶと計算しやすい。これを正規直交基底という。
      </p>

      <h4>ヒルベルト空間では何が違うのか</h4>
      <p>この考えを、今度は量子力学へ広げてみよう。</p>
      <p>
        先ほどの座標平面では実数の係数でベクトルを表したが、量子力学では複素数の係数も使える必要がある。また、ベクトル同士がどれほど重なるかを計算する内積が定義されていなければならない。
      </p>
      <p>
        数学的には、ヒルベルト空間は内積が定義され、完備性を満たすベクトル空間だ。量子力学では、通常は複素ヒルベルト空間を使う。
      </p>
      <p>
        完備性とは、簡単にいえば、ベクトルを順に並べ、後ろにいくほど互いに限りなく近づくなら、その極限も同じ空間内に存在するという性質だ。
      </p>
      <p>
        難しい定義に感じるかもしれないが、いまは次のように理解すれば十分だ。
      </p>
      <blockquote>
        <p>
          ヒルベルト空間は、量子状態をベクトルで表し、ベクトルを足したり内積を計算したりするための数学的な空間である。
        </p>
      </blockquote>
      <p>
        重要なのは、この空間が必ずしも私たちの住む3次元の物理空間を意味しないことだ。たとえば電子のスピン状態だけなら、2次元複素ヒルベルト空間で表せる。
      </p>

      <h4>1個の電子のスピンで考えてみよう</h4>
      <p>
        電子のスピンをある軸に沿って測ると、結果は2つになる。この軸をZ軸とし、上向きに対応する状態を|0⟩、下向きに対応する状態を|1⟩と書こう。|
        ⟩は状態ベクトルを表す記法だ。
      </p>
      <p>ベクトルで書けば次のようになる。</p>
      <Equation name="hilbert-spin-basis" />
      <p>
        ここで|0⟩と|1⟩を基底状態と呼ぶ。先ほどの座標平面とベクトルの形は同じだが、今度は2つのスピン状態を表す基準になる。
      </p>
      <p>では、電子はこのどちらか一方の状態にしかなれないのだろうか。</p>
      <p>そうではない。量子力学では、2つの状態の重ね合わせが可能だ。</p>
      <Equation name="hilbert" />
      <p>
        αとβは複素数の係数で、それぞれの基底ベクトルをどれだけずつ組み合わせるかを表す。
      </p>
      <p>
        正規化された状態は、次の条件を満たす。2つの結果の確率の和が1になるよう、状態ベクトルの長さをそろえている。
      </p>
      <Equation name="hilbert-normalization" />
      <p>たとえば、次の状態を考えてみよう。</p>
      <Equation name="hilbert-example" />
      <p>
        この状態をZ軸に沿って測ると、上向き|0⟩は75%、下向き|1⟩は25%の確率で出る。各係数の絶対値を2乗すると、この確率が得られる。
      </p>
      <Equation name="hilbert-born" />
      <p>
        これがボルンの規則だ。大切なのは、αとβが確率そのものではなく、確率振幅であることだ。確率は、各係数の絶対値を2乗して求める。
      </p>
      <p>
        この違いを図でも確かめてみよう。下では、2つの係数が0以上の実数である場合を扱う。
      </p>
      <p className="cn-task" id="hilbert-state-task">
        「75:25」と「50:50」を順に選んでみよう。基準軸は固定され、状態ベクトルが変わる。50:50では係数がそれぞれ約0.707だが、確率はそれぞれ0.5だ。破線から読み取る係数と、その2乗である確率を比べてみよう。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="状態ベクトルの組み合わせの例"
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
              ? "0だけが出る"
              : value === 30
                ? "75:25"
                : value === 45
                  ? "50:50"
                  : "1だけが出る"}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        係数平面での状態ベクトルの角度 <output>{angle}°</output>
        <input
          aria-label="状態ベクトルの係数の組み合わせを表す角度"
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
          aria-label={`固定した2つの基底に対する状態ベクトル。アルファ${a.toFixed(3)}、ベータ${b.toFixed(3)}。0の確率${(a * a * 100).toFixed(1)}パーセント、1の確率${(b * b * 100).toFixed(1)}パーセント。`}
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
            係数α、βの平面
          </text>
        </svg>
        <figcaption>
          横軸と縦軸は2つの基底の係数だ。図の角度は、この係数平面で測る。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {angle === 0
            ? "最初の基底|0⟩だけが残るので、この基準で測ると必ず0が出る。"
            : angle === 90
              ? "2つ目の基底|1⟩だけが残るので、この基準で測ると必ず1が出る。"
              : angle === 30
                ? "係数は約0.866と0.500で、2乗すると確率75%と25%になる。"
                : angle === 45
                  ? "2つの係数はそれぞれ約0.707だ。2乗した確率はそれぞれ50%になる。"
                  : "状態ベクトルを各基準軸に下ろして読む値が係数だ。その絶対値を2乗すると確率になる。"}
        </span>
        係数α ≈ {a.toFixed(3)}, β ≈ {b.toFixed(3)}
      </div>
      <div
        className="cn-probabilities"
        role="img"
        aria-label={`0の確率${(a * a * 100).toFixed(1)}パーセント、1の確率${(b * b * 100).toFixed(1)}パーセント`}
      >
        <div>
          <span>0の確率|α|² · {(a * a * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${a * a * 100}%` }} />
          </div>
        </div>
        <div>
          <span>1の確率|β|² · {(b * b * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${b * b * 100}%` }} />
          </div>
        </div>
      </div>
      <p>
        一般の状態では、2つの係数に複素数の位相も含まれる。この図は、そのうち実数の係数だけを使う一部の状態を示している。追加の情報を球面上で表す方法が、のちに見るブロッホ球面だ。
      </p>

      <h4>基底を変えると、同じ状態の表し方も変わる</h4>
      <p>先ほどは|0⟩と|1⟩を基底にした。しかし、別の基底も選べる。</p>
      <Equation name="hilbert-other-basis" />
      <p>この2つも、互いに直交し長さが1の正規直交基底ベクトルだ。</p>
      <p>では、|0⟩を新しい基底で表すとどうなるだろうか。</p>
      <Equation name="hilbert-rebase" />
      <p>
        もとは|0⟩という1つの基底状態だったが、新しい基底では2状態の重ね合わせで表される。上の|+⟩と|−⟩を足すと、|1⟩の成分が打ち消され、|0⟩の成分だけが残ることを確かめられる。
      </p>
      <p>
        ただし、実際の量子状態は変わっていない。状態を表す座標系が変わっただけだ。
      </p>
      <p>
        さらに実際の測定方向を変えると、観測する確率も変わる。同じ|0⟩状態でも、Z軸で測れば|0⟩が100%出るが、X軸なら|+⟩と|−⟩がそれぞれ50%になる。同じ実験を別の座標で書くことと、異なる基底状態を区別する測定を実際に行うことは、区別しなければならない。
      </p>
      <p className="cn-task" id="hilbert-basis-task">
        下では、用意する状態を|0⟩に固定し、Z軸・X軸の測定基準だけを切り替える。黒い状態ベクトルが動かないことを見てみよう。変わるのは灰色の基底、その基底での係数、そして対応する測定の確率だ。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="固定した0状態を測る基準"
        aria-describedby="hilbert-basis-task"
      >
        <button
          type="button"
          aria-pressed={isZ}
          onClick={() => setMeasurementBasis("z")}
        >
          Z軸基底 |0⟩、|1⟩
        </button>
        <button
          type="button"
          aria-pressed={!isZ}
          onClick={() => setMeasurementBasis("x")}
        >
          X軸基底 |+⟩、|−⟩
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="60 0 520 275"
          role="img"
          aria-label={`同じ0状態を${isZ ? "Z" : "X"}基底で表した図。黒い状態ベクトルは固定され、測定確率は${isZ ? "0が100パーセント、1が0パーセント" : "プラスとマイナスがそれぞれ50パーセント"}.`}
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
            状態|0⟩
          </text>
          {isZ ? (
            <>
              <text x="370" y="180" className="cn-lesson-angle">
                基底|0⟩
              </text>
              <text x="240" y="25" className="cn-lesson-angle">
                基底|1⟩
              </text>
            </>
          ) : (
            <>
              <text x="332" y="48" className="cn-lesson-angle">
                基底|+⟩
              </text>
              <text x="332" y="247" className="cn-lesson-angle">
                基底|−⟩
              </text>
            </>
          )}
        </svg>
        <figcaption>
          黒線：固定した状態|0⟩ · 灰色の線：選んだ基底
          <br />
          係数平面の図だ。破線は、同じ状態を新しい基底に下ろして読む係数を示す。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>用意した状態|0⟩ · {isZ ? "Z軸測定" : "X軸測定"}</strong>
        <span className="cn-observation">
          {isZ
            ? "基底の係数は1と0。測定すると0が100%、1が0%で出る。"
            : "基底の係数はそれぞれ1/√2 ≈ 0.707。測定すると+と−がそれぞれ50%で出る。"}
        </span>
      </div>
      <p>
        これが、量子力学で測定方向が重要な理由だ。CHSH不等式では、アリスとボブが異なる測定方向を選んだ。その選択は数学的には、異なる基底状態を区別する測定を選ぶことにつながる。同じもつれた状態でも、2人の選ぶ方向に応じて結果の相関が変わる。
      </p>

      <h4>2粒子を一緒に扱うと、ヒルベルト空間も大きくなる</h4>
      <p>
        1個の電子のスピン状態は、2次元複素ヒルベルト空間で表せた。では、2個の電子のスピンを一緒に表すにはどうすればよいだろうか。
      </p>
      <p>
        2つの空間のテンソル積を使う。1つ目の粒子の2基底と、2つ目の粒子の2基底を組み合わせると、2粒子を表す4つの基底ベクトルが得られる。
      </p>
      <Equation name="hilbert-tensor" />
      <p>
        各粒子が2次元なので、全体は2×2の4次元になる。たとえば|01⟩は、1つ目の粒子が|0⟩、2つ目が|1⟩である状態を表す。一般の2粒子状態は、この4基底の組み合わせで表せる。
      </p>
      <p>その中の特別な状態がベル状態だ。</p>
      <Equation name="hilbert-bell" />
      <p>
        この状態は、一方の粒子の状態と他方の状態を単純に掛けて表すことができない。それぞれに0と1の成分を入れて掛けると、|00⟩と|11⟩だけでなく、|01⟩と|10⟩も生じるからだ。上の式のように前の2成分だけを残すことはできない。このような純粋状態を、量子もつれ状態と呼ぶ。
      </p>
      <p>
        ただし、Z軸で00と11が半分ずつ出るだけでは、もつれを確認できない。00か11を確率的に用意した場合と区別するには、ほかの測定基準で得る統計も見る必要がある。
      </p>
      <p>
        ここに重要な点がある。粒子をまとめて扱うヒルベルト空間の次元は、粒子数とともに急速に大きくなる。電子スピンのように2つの基底状態を持つ量子ビットがn個なら、各量子ビットの2基底を組み合わせるので、次元は次のようになる。
      </p>
      <Equation name="hilbert-dimension" />
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">量子ビット数 </th>
              <th scope="col">状態空間の次元</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 10, 20].map((n) => (
              <tr key={n}>
                <th scope="row">{n}個 · </th>
                <td>{(2 ** n).toLocaleString("ja-JP")}次元</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        ここでいう次元は、独立な複素基底ベクトルの数だ。物理空間の次元が増えるという意味ではない。
      </p>
      <p>
        量子コンピューターの説明でヒルベルト空間がよく登場する理由でもある。ただし、状態空間の次元が急速に増すからといって、すべての情報を1回の測定で読めるわけではない。1回の測定で得るのは、選んだ基底に対応する結果のうち1つだ。
      </p>

      <h4>ド・ブロイ＝ボーム理論とはどうつながるのか</h4>
      <p>
        ここで、先ほどのド・ブロイ＝ボームのガイディング方程式につなげてみよう。
      </p>
      <p>
        先ほどは電子のスピン状態を扱った。今度は粒子の空間的な状態を考える。
      </p>
      <p>
        量子状態を表す|ψ⟩は、抽象的なヒルベルト空間の状態ベクトルだ。粒子の空間的な状態を位置基底で表すとどうなるだろうか。
      </p>
      <Equation name="hilbert-position" />
      <p>
        それが、よく目にする波動関数になる。右辺の⟨x|ψ⟩は、状態|ψ⟩を位置xについて表した係数という意味だ。
      </p>
      <p>
        スピン状態を|0⟩と|1⟩の係数で表したように、粒子の空間的状態も各位置に対応する係数で表せる。今度は位置が連続的に変わるので、2つの係数ではなく、位置についての関数になる。
      </p>
      <p>
        厳密には、正確な1つの位置を指す|x⟩は、通常の正規化可能なベクトルではない。位置が連続的なために使う、一般化された基底だ。
      </p>
      <p>
        スピンのない1粒子が3次元空間で動くなら、波動関数はψ(x,
        t)と表す。ここでxは3つの位置座標をまとめたベクトルだ。可能な位置全体で確率を足すと1になる必要があるので、正規化の条件は次のようになる。
      </p>
      <Equation name="hilbert-position-norm" />
      <p>
        先ほどは2つの係数の絶対値の2乗を足したが、ここでは連続した位置全体について積分する。このような波動関数が属する代表的なヒルベルト空間がL²(ℝ³)、つまり2乗積分可能な複素関数の空間だ。
      </p>
      <p>
        ド・ブロイ＝ボームのガイディング方程式に現れるψも、この位置表示の波動関数だ。抽象的な状態ベクトルを位置基底で表し、その表現の位相の勾配から粒子の速度を計算している。
      </p>

      <h4>ここまでの概念をつなげると</h4>
      <p>
        ヒルベルト空間は、量子状態を表す抽象的な数学的空間だ。粒子が動き回る物理空間と同じものではない。
      </p>
      <p>
        基底ベクトルは、その状態を表す座標系の役割を担う。同じ状態でも、基底によっては1つの基底状態にも、複数の基底状態の重ね合わせにもなる。
      </p>
      <p>
        波動関数は、その状態ベクトルの表現方法の1つだ。スピン基底ならスピン測定の確率を、位置基底なら位置測定の確率を求められる。物理的状態と、それを表す座標を区別することが重要だ。
      </p>

      <h4>本文のオートマトンとはどうつながるのか</h4>
      <p>
        今度は、オートマトンの区別できる状態ごとに基底ベクトルを1つ割り当てよう。状態Aに|A⟩、状態Bに|B⟩を対応させる。AとBが別の状態であることを、2基底が直交することで表せる。
      </p>
      <p>
        AからB、BからAへ変わる遷移なら、次のように書ける。Uは、この状態遷移をベクトルに適用する演算だ。
      </p>
      <Equation name="hilbert-automaton" />
      <p>
        この演算は2つの基底ベクトルを入れ替える置換だ。組み合わせたベクトルにも同じ規則を線形に適用すると、長さと内積を保つ。この性質を持つ可逆な演算をユニタリ演算という。複数の状態を1つにまとめ、元に戻せなくする遷移は、このような置換ではない。
      </p>
      <p>
        決定論的な状態遷移も、このように量子力学の数学的言語で表せる。ただし、それが可能であることと、実際の自然がそのオートマトンの規則で動くことは、別々に検討しなければならない。
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
  const distanceLabel = distance.toLocaleString("ja-JP", {
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
      <p>最初に要点を整理すると、次のようになる。</p>
      <ul>
        <li>
          アトラクター：時間とともに、さまざまな初期状態からの運動が近づく点・軌道・集合。
        </li>
        <li>
          ストレンジアトラクター：しばしばフラクタル構造を持つアトラクター。代表例のローレンツアトラクターでは、その内部の運動も複雑で非周期的になる。
        </li>
      </ul>
      <p>
        興味深いのは、運動が起こる領域は限られているのに、その内部でどんな軌道をたどるかを長期的には正確に予測しにくいことだ。この2つはどう両立するのだろうか。まず単純な例から考えよう。
      </p>

      <h4>アトラクターとは何か</h4>
      <p>
        ボウルの中を球が転がる場面を考えてみよう。どこから放しても、摩擦があれば、やがて底に落ち着いて止まる。初期位置と速度が違っても、最後に達する状態は同じだ。
      </p>
      <p>
        この、底で静止した状態をアトラクターと呼べる。底という場所だけではなく、球が底にあり、速度が0であるという状態全体を指している。
      </p>
      <p>
        ただし、アトラクターは必ずしも1つの静止状態とは限らない。繰り返す運動の軌道全体もアトラクターになりうる。この違いを理解するために、まず運動の描き方を見てみよう。
      </p>

      <h4>運動を状態空間に描いてみよう</h4>
      <p>
        私たちは普通、物体の動きを実際の空間で考える。一方、力学ではシステムの状態全体を1つの点で表す。
      </p>
      <p>
        たとえば振り子の状態を知るには、位置だけでは足りない。同じ位置でも、右へ動くか左へ動くかで次の運動が変わる。位置だけでなく速度も必要だ。
      </p>
      <Equation name="attractor-state" />
      <p>
        θは振り子の角度、ωは角速度だ。この2つの値を軸にした空間が位相空間（Phase
        Space）である。時間とともに状態を表す点が動き、その点が描く線を軌道という。
      </p>
      <p>
        先ほどの球が底で止まる様子をこの空間に描くと、さまざまな出発点からの軌道が1点へ集まる。一方、一定の振動を続けるなら、状態は1点に止まらず、同じ閉じた軌道を繰り返し回る。
      </p>
      <p>
        先ほどのヒルベルト空間とも区別しよう。あちらは量子状態をベクトルで表す空間だった。ここでは、古典的なシステムの位置や速度といった状態変数を座標にしている。
      </p>

      <h4>1点へ集まることと、同じ軌道を繰り返すことは違う</h4>
      <p>
        摩擦だけを受ける振り子はやがて止まるが、エネルギーの供給で振動を保つシステムでは、周囲のさまざまな状態から同じ周期軌道へ近づくことがある。このような安定した周期軌道をリミットサイクルという。
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label="位相空間の概念図。固定点アトラクターでは軌道が1点へ、安定したリミットサイクルでは閉曲線へ近づく。"
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
            固定点アトラクター
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
            安定したリミットサイクル
          </text>
        </svg>
        <figcaption>
          左は1点へ、右は閉じた軌道全体へ近づく。位相空間の概念図であり、球が物理空間で通る道を描いたものではない。
        </figcaption>
      </figure>
      <p>
        数学的には、さまざまな初期状態からの軌道が時間とともに近づく不変集合を考える。不変とは、その集合内から出発すれば、その後も内部にとどまることだ。あるアトラクターへ近づく初期状態の領域を、吸引域と呼ぶ。
      </p>
      <p>
        固定点ならどこに止まるか、周期軌道ならどんな運動を繰り返すかを、比較的容易に捉えられる。だが、次の種類では事情が変わる。
      </p>

      <h4>ストレンジアトラクターの代表例、ローレンツアトラクター</h4>
      <p>
        下の蝶の羽のような構造がローレンツアトラクターだ。1963年、エドワード・ローレンツが対流現象の簡略化した数学モデルを研究する中で発見した。
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label="ローレンツ方程式を計算した50モデル時間の軌道。x–zへの投影で、軌道が2つの羽のような領域を行き来する。"
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
          3つの状態変数x、y、zのうち、xとzだけを平面に移した図だ。蝶の形をした物体ではなく、状態が移動した跡を示している。
        </figcaption>
      </figure>
      <p>
        1本1本の線は、時間とともに状態が移った跡だ。左の羽を何周かしてから右へ移り、また左へ戻る。全体として限られた領域にとどまるが、典型的な軌道は同じ運動を周期的には繰り返さない。
      </p>
      <p>この複雑な運動を作る規則は、3つの微分方程式だ。</p>
      <Equation name="lorenz" />
      <p>
        左辺のdx/dtなどは、各状態変数が時間に応じてどれだけ変わるかを表す。σ、ρ、βはモデルの係数で、上の図ではよく使われる次の値に固定した。
      </p>
      <Equation name="lorenz-parameters" />
      <p>
        ここに乱数や、次の瞬間を選ぶ確率的な選択はない。現在の状態が正確に与えられれば、次の変化は決まる。それでも長期的な運動は非常に不規則になる。では、何が予測を難しくするのだろうか。
      </p>

      <h4>同じアトラクターへ集まるのに、なぜ予測が難しいのか</h4>
      <p>
        ほとんど同じ初期状態から出発する2つのシステムを考えよう。初めは軌道がほぼ重なるが、時間とともに大きな違いが生じうる。これが初期条件への敏感さだ。
      </p>
      <p>
        下では、同じローレンツ方程式で2本の軌道を計算した。初期状態はxだけが0.000001違い、yとzは同じだ。計算中に方程式の係数や外部条件は変えていない。
      </p>
      <p className="cn-task" id="attractor-task">
        時刻を0→10→20と進めてみよう。実線と破線はそれぞれの最近の軌道、塗りつぶした点と白抜きの点は同じ時刻の状態だ。初めは重なって見えるが、のちには違う位置にある。全体として似た領域を動くことと、同時刻に同じ状態であることの違いを比べてみよう。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="近い2つの初期状態を観察する時刻"
        aria-describedby="attractor-task"
      >
        {[0, 10, 20, 30].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={time === value}
            onClick={() => setTime(value)}
          >
            時刻 {value}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        観察開始からのモデル時間 <output>{time.toFixed(1)}</output>
        <input
          type="range"
          min="0"
          max="30"
          step="0.1"
          value={time}
          aria-label="近い2つのローレンツ状態の観察時刻"
          aria-describedby="attractor-task"
          onChange={(e) => setTime(+e.target.value)}
        />
      </label>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label={`モデル時間${time}。初めはxだけが100万分の1違った2状態の現在の距離は${distance.toExponential(2)}。塗りつぶした点がA、白抜きの点がB。実線と破線は最近の軌道。`}
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
          A：実線と塗りつぶした点 /
          B：破線と白抜きの点。薄い線は全体の形を示す。
          <br />
          図はx–zへの投影だが、距離は省略したyを含む3変数で求める。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>同じ時刻の2状態の距離 ≈ {distanceLabel}</strong>
        <span className="cn-observation">
          {time === 0
            ? "初期の差は約0.000001。この縮尺では2点が重なって見える。"
            : distance < 0.1
              ? "差が生じているが、2点はまだ近い。さらに時間を進め、同じ時刻の状態を比べてみよう。"
              : "2状態は同じアトラクターの周囲を動きながら、違う位置にある。出発時に近くても、長い時間がたったあとまで近いとは限らない。"}
        </span>
      </div>
      <p>
        この差が、毎瞬間まったく同じ割合で増えるわけではない。ただし差が十分に小さい間は、次のような指数的増大で傾向を説明できる。
      </p>
      <Equation name="attractor-sensitivity" />
      <p>
        δ₀は初期状態の差、δ(t)は時間tのあとの差だ。λは差の増減の速さを表すリアプノフ指数である。最大の指数が正なら、近い軌道の小さな違いが平均的に増幅される方向がある。
      </p>
      <p>
        これがバタフライ効果の数学的な核心だ。ただし運動全体は限られた領域にとどまるので、差が無限に増え続けるわけではない。この図も方程式を有限の時間だけ数値計算した例で、カオスの数学的な証明ではない。
      </p>

      <h4>離れていく軌道が、どうして同じアトラクターにとどまれるのか</h4>
      <p>
        ここで重要な疑問が生まれる。近い軌道同士が離れるなら、全体としてどう同じアトラクターへ集まれるのだろうか。
      </p>
      <p>
        答えは、異なる方向で収縮と膨張が同時に起きるからだ。ある方向では近い状態が離れ、別の方向では距離が縮まる。引き伸ばされた軌道が戻って折りたたまれることで、運動全体は限られた領域にとどまれる。
      </p>
      <p>
        つまり、アトラクターという集合へ近づくことと、その集合内の2状態が互いに近づくことは違う。1点に集まるアトラクターでは両方が同時に起こるが、ローレンツアトラクターでは、集合へ近づきながら内部の近い軌道同士が離れることがある。
      </p>

      <h4>ここでなぜフラクタル構造が現れるのか</h4>
      <p>
        引き伸ばし、圧縮し、折りたたむことを繰り返すと、どんな構造が残るだろうか。滑らかな線や1枚の曲面ではなく、小さな尺度でも層の間にさらに層や隙間が現れる構造が生まれうる。
      </p>
      <p>
        フラクタルは、このように拡大するほど細かな構造が見える幾何学的な対象だ。尺度を変えてもまったく同じ模様を繰り返すものもあるが、すべてが完全な自己相似性を持つわけではない。
      </p>
      <p>
        ローレンツアトラクターは3次元の位相空間にあるが、その空間を埋め尽くさない。薄い層が重なる構造にフラクタル的性質が現れる。ただし、画面に描いた数周の線を拡大するだけで、その構造をそのまま確認できるわけではない。次のカントール集合は、小さな尺度にも構造が残ることを、より単純な例で示してくれる。
      </p>
      <p>
        ストレンジアトラクターの厳密な定義にはいくつかの流儀がある。ここではローレンツアトラクターのように、フラクタル構造とカオス的運動が一緒に現れる代表例を考えればよい。
      </p>

      <h4>では、決定論と予測はどう違うのか</h4>
      <p>
        最初の問いに戻ろう。すべての出来事が前の状態で決まることと、観察者が未来をすべて正確に予測できることは、同じ主張だろうか。
      </p>
      <p>
        ローレンツモデルでは、運動の規則が決定論的でも、初期状態の小さな誤差がのちに大きな差になる。初期状態を精密に知れば予測できる時間を延ばせるが、有限の精度で遠い未来の個々の状態まで正確に当て続けられる保証はない。
      </p>
      <p>
        だからといって、何も予測できないわけではない。いつ左の羽にいるかを正確に当てるのは難しくても、どの領域に運動がとどまるか、長期的にどんな統計的性質を示すかは研究できる。個々の状態の未来と、運動全体の構造の予測は区別できる。
      </p>
      <p>
        カオス理論は、宇宙全体が決定論的だと証明したわけではない。決定論的な数学の規則だけでも、複雑で長期予測の難しい運動が生まれることを示す。本文の宇宙の不変集合も、この例から直接導ける結論ではなく、別に検討すべき物理的仮説だ。
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
        先ほど、ストレンジアトラクターはフラクタル構造を持ちうると述べた。では、「拡大しても細かな構造が現れる」とは、具体的にどんな姿だろうか。今度は動く軌道ではなく、1本の線分から始めよう。
      </p>

      <h4>フラクタルは、単に複雑な形のことだろうか</h4>
      <p>
        見た目が複雑なだけでフラクタルとは呼ばない。小さな尺度でも構造が現れ続けることや、その構造と拡大率の関係が重要だ。
      </p>
      <p>
        そのうち、小さな部分を拡大すると全体と同じ構造が現れる性質を、自己相似性という。カントール集合は、これを正確に示す例だ。まず作り方の規則を見て、どの部分が繰り返されるかを確かめよう。
      </p>

      <h4>線分の真ん中だけを取り除こう</h4>
      <p>
        長さ1の線分、つまり0から1までのすべての点から始める。3等分し、中央の3分の1の内部を取り除く。すると0から1/3、2/3から1の2区間が残る。境界の1/3と2/3は取り除かずに残す。
      </p>
      <p>
        残った2区間にも同じ規則を適用しよう。それぞれの中央3分の1を取り除くと、長さ1/9の区間が4つ残る。次は、その4区間からそれぞれ中央を取り除く。規則は最初から最後まで同じだ。
      </p>
      <p className="cn-task" id="cantor-task">
        「1段階進める」を2回押してみよう。1区間が2つに分かれるたびに区間の数は増すが、残った全体の長さは短くなる。黒い区間と下の数値を比べよう。どの行も同じ0〜1の範囲を示している。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="カントール集合の構成"
        aria-describedby="cantor-task"
      >
        <button
          type="button"
          onClick={() => setStage(0)}
          disabled={stage === 0}
        >
          最初に戻す
        </button>
        <button
          type="button"
          onClick={() => setStage(Math.min(5, stage + 1))}
          disabled={stage === 5}
        >
          1段階進める
        </button>
      </div>
      <label className="cn-slider">
        除去の段階 <output>{stage}</output>
        <input
          aria-label="カントール集合の除去段階"
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
          aria-label={`カントール集合の第0段階から第${stage}段階。残った区間は${segments.length}個、全長は初めの${(100 * (2 / 3) ** stage).toFixed(1)}パーセント`}
        >
          {Array.from({ length: stage + 1 }, (_, n) => (
            <g key={n}>
              <text x="10" y={36 + n * 34}>
                {n}段階
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
          黒い部分が残った区間、白い隙間が取り除いた部分だ。端点は残す。画面は最大5段階までの近似である。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          {segments.length}区間 · 各長 {stage === 0 ? "1" : `1/${3 ** stage}`} ·
          全長 {stage === 0 ? "1" : `${2 ** stage}/${3 ** stage}`} ≈{" "}
          {(100 * (2 / 3) ** stage).toFixed(1)}%
        </strong>
        <span className="cn-observation">
          {stage === 0
            ? "まだ取り除いていない。長さ1の区間1つから始める。"
            : `区間数は前の段階の2倍になったが、全長は前の2/3だけが残った。区間の数とその長さは違う変わり方をする。`}
        </span>
      </div>
      <p>
        この操作を無限に繰り返したとき、どの段階でも取り除かれない点の集合がカントール集合だ。ある有限段階で残る区間と、無限の過程で定義する最終的な集合は区別しよう。
      </p>

      <h4>長さが0なら、何も残らないのだろうか</h4>
      <p>
        全長は1、2/3、4/9、8/27の順に短くなる。毎回、前の長さの2/3だけが残るので、n回繰り返した長さは次のようになる。
      </p>
      <Equation name="cantor-length" />
      <p>
        繰り返すと、この値は限りなく0へ近づく。最終的なカントール集合の長さも0だ。では、点がすべて消えたのだろうか。
      </p>
      <p>
        そうではない。最初から残した0と1は、どの段階でも消えない。1/3や2/3など、取り除いた区間の端点も残り続ける。長さが0であることと、集合が空であることは違う。
      </p>
      <p>
        残るのは端点だけでもない。各段階で左か右の区間を選ぶと考えてみよう。選び続けると区間は短くなり、無限に続く1つの選択列が、最終的に1つの点を定める。
      </p>
      <p>
        たとえば左、右、左、右と交互に選び続けると、1/4という点へ絞られる。右を選ぶたびに加わる移動量を足すと、下の式になる。この点はどの段階の端点でもないが、中央の除去部分には入らないので最後まで残る。
      </p>
      <Equation name="cantor-quarter" />
      <p>
        このような無限の選択列は、自然数のように番号を付けてすべて列挙できないほど多い。カントール集合の点も、その意味で非可算無限個ある。点がどれほど多いかと、それらが占める長さは、別の問いなのである。
      </p>

      <h4>小さな部分を拡大すると何が見えるのか</h4>
      <p>
        残った形を見直そう。初めの左3分の1の内部でも、同じ中央除去の操作が繰り返されていた。右側でも同じだ。だから最終的な集合の左側を3倍に拡大すると、全体と同じ構造が現れる。
      </p>
      <p className="cn-task" id="cantor-zoom-task">
        今度は第3段階の形を固定し、「左1/3を拡大」を選んでみよう。上で枠に囲んだ部分を、下の同じ幅へ引き伸ばして示す。小さな部分にも、中央が空き、両側に分かれる構造があることを見よう。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="カントール集合の自己相似性"
        aria-describedby="cantor-zoom-task"
      >
        <button
          type="button"
          aria-pressed={!zoom}
          onClick={() => setZoom(false)}
        >
          全体を見る
        </button>
        <button type="button" aria-pressed={zoom} onClick={() => setZoom(true)}>
          左1/3を拡大
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 215"
          role="img"
          aria-label={
            zoom
              ? "第3段階の近似の左3分の1を3倍に拡大すると、第2段階の全体と同じ形になる。"
              : "第3段階の近似全体を、上下で同じ幅に表示している。左3分の1を選んで拡大できる。"
          }
        >
          <text x="20" y="23">
            第3段階の全体
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
            {zoom ? "左1/3を3倍に拡大" : "選んだ全体を同じ大きさで表示"}
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
          上の枠内の点を下に拡大して描く。見方だけを変え、点を作ったり、さらに取り除いたりはしていない。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        {zoom
          ? "第3段階の近似の左3分の1を3倍に拡大した。内部の4区間は、第2段階の全体と同じ形に並んでいる。"
          : "第3段階の近似の全体像だ。左3分の1を拡大し、内部にも同じ分割の規則があるか比べてみよう。"}
      </div>
      <p>
        有限段階の図では、拡大すると残る細部の段階が1つ減る。上で第3段階と第2段階を比べるのはそのためだ。しかし無限に繰り返した最終的な集合には最後の段階がないので、部分を拡大しても全体と正確に同じ構造を得られる。これがカントール集合の自己相似性だ。
      </p>
      <p>
        ただし、どのフラクタルもカントール集合のように同じ形を正確に繰り返すわけではない。ローレンツアトラクターもこの線分と同じ形ではない。小さな尺度にも構造を見る必要がある、という共通点を、この単純な例で理解すればよい。
      </p>

      <h4>では、本文ではなぜこの例が必要なのか</h4>
      <p>
        カントール集合には無数の点が残るが、点同士を連続的につなぐ線分は残らない。残った点の周囲をどれほど小さく見ても、集合内の点と、取り除いた隙間に再び出会う。
      </p>
      <p>
        たとえば1/3は集合内にあるが、そのすぐ右には最初に取り除いた隙間がある。したがって、集合上の点から少し動かしただけでは、移動先も集合内にあるとはいえない。
      </p>
      <p>
        本文で考えたいのは、こうした幾何学的制約だ。状態の集合が空間全体を埋めないなら、変数を少し変えた組み合わせが集合の外に出るかもしれない。ただし、この構造をカントール集合が示すことと、実際の宇宙の状態も同じように制限されるという仮説は、別々に検討しなければならない。
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
            ? `純粋状態のブロッホ球面。シータ${t}度、ファイ${p}度。Z軸で0が出る確率${(state.p0 * 100).toFixed(1)}パーセント、X軸でプラスが出る確率${((1 + state.x) * 50).toFixed(1)}パーセント`
            : "ブロッホ球面の構造。北極は0、南極は1、赤道のX軸両端はプラスとマイナス状態。中心から伸びる矢印の先が1つの純粋状態を指す。"
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
        先ほどのヒルベルト空間と基底ベクトルが、ここにつながる。本文に登場するティム・パーマーの不変集合理論を理解するうえでも必要な概念だ。まず、球面上の点が何を意味するかを見よう。
      </p>

      <h4>球面で量子状態を表すとは？</h4>
      <figure className="cn-lesson-figure">
        {sphere(55, 35, false)}
        <figcaption>
          中心から伸びた矢印が状態|ψ⟩を指す。実際の粒子の位置や経路ではなく、量子状態を表す図だ。
        </figcaption>
      </figure>
      <p>
        上の図では、球の中心からある方向へ矢印が伸びている。その方向が量子ビットの状態を表す。量子ビットとは、|0⟩と|1⟩という2つの基底状態で記述する量子系だ。
      </p>
      <p>
        まず代表的な状態を見よう。下の確率は、すべてZ軸に沿って測った場合のものだ。
      </p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">球面上の位置</th>
              <th scope="col">状態</th>
              <th scope="col">Z軸での測定結果</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">北極（+Z）</th>
              <td>|0⟩</td>
              <td>0が100%</td>
            </tr>
            <tr>
              <th scope="row">南極（−Z）</th>
              <td>|1⟩</td>
              <td>1が100%</td>
            </tr>
            <tr>
              <th scope="row">赤道（+X）</th>
              <td>|+⟩</td>
              <td>0と1がそれぞれ50%</td>
            </tr>
            <tr>
              <th scope="row">赤道（−X）</th>
              <td>|−⟩</td>
              <td>0と1がそれぞれ50%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        ここに不思議な点がある。赤道の正反対にある|+⟩と|−⟩は、どちらも50:50の確率を持つのに、異なる状態だ。同じ確率が出るのに、どう違う状態なのだろうか。これがブロッホ球面を理解する核心になる。
      </p>

      <h4>量子状態には、確率だけでなく位相がある</h4>
      <p>先ほど見たように、量子ビットの状態は次のように表せる。</p>
      <Equation name="bloch-state" />
      <p>αとβは複素数の係数で、正規化された状態なら次の条件を満たす。</p>
      <Equation name="bloch-normalization" />
      <p>
        この係数の絶対値を2乗すると、Z軸での測定確率が得られる。しかし複素数には大きさだけでなく位相もある。2係数の位相の差を相対位相と呼ぶ。係数の大きさが同じでも、この差は変わりうる。
      </p>
      <p>
        両係数に同じように掛かる全体位相（Global
        Phase）は、測定結果では区別できない。この重複を除くと、状態を次のように書き直せる。
      </p>
      <Equation name="bloch" />
      <p>複雑に見えても、状態を決める変数は2つの角度だ。</p>
      <ul>
        <li>
          θ（シータ）：北極からどれだけ下がったかを表す。Z軸での測定確率に対応する。
        </li>
        <li>
          φ（ファイ）：Z軸の周りをどれだけ回ったかを表す。2つの基底状態の間の相対位相だ。
        </li>
      </ul>
      <p>
        この2角度で、任意の単一量子ビットの純粋状態を表せる。θが同じなら球面上の高さもZ軸の測定確率も同じだ。φを変えると、その高さを保って球の周囲を回る。
      </p>
      <Equation name="bloch-probabilities" />
      <p>
        式のeの項は、大きさを1に保ったまま位相だけを変える係数だ。φ=0°なら+1、180°なら−1になる。したがって、両係数の大きさを保って相対的な符号を変えられる。これが、先ほどの赤道上の2状態を区別する違いだ。
      </p>

      <h4>実際に角度を変えてみよう</h4>
      <p>
        下ではθとφを操作し、用意する状態を変える。比較に使うZ軸とX軸の測定は固定する。X軸の2結果は+と−で表そう。
      </p>
      <p className="cn-task" id="bloch-task">
        まず「北極|0⟩」「赤道|+⟩」「南極|1⟩」を順に選び、Z軸の確率を見よう。次に「赤道|+⟩」と「赤道|−⟩」を交互に選ぶ。Z軸は50:50のままで、X軸はどう変わるか比べよう。
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="ブロッホ状態の比較"
        aria-describedby="bloch-task"
      >
        {[
          { t: 0, p: 0, label: "北極 |0⟩" },
          { t: 90, p: 0, label: "赤道 |+⟩" },
          { t: 90, p: 180, label: "赤道 |−⟩" },
          { t: 180, p: 0, label: "南極 |1⟩" },
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
          北極からの角度θ <output>{theta}°</output>
          <input
            aria-label="ブロッホ球面の極角"
            aria-describedby="bloch-task"
            type="range"
            min="0"
            max="180"
            value={theta}
            onChange={(e) => setTheta(+e.target.value)}
          />
        </label>
        <label className="cn-slider">
          Z軸の周りの角度φ <output>{phi}°</output>
          <input
            aria-label="ブロッホ球面の方位角"
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
          矢印の先が、用意した純粋状態だ。破線の円は同じθを持つ状態を結ぶ。3次元の球を平面に移したので、表面の点も図では円の内側に見えることがある。
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {atPole
            ? "極ではφを回しても同じ状態だ。北極はZ軸で0だけ、南極は1だけが出る。"
            : isPlus
              ? "|+⟩状態。Z軸では0と1が半々だが、X軸では+が100%出る。"
              : isMinus
                ? "|−⟩状態。Z軸では半々のままだが、X軸では−が100%出る。"
                : "θを固定してφだけを変えてみよう。Z軸の確率は保たれるが、X軸の確率は変わりうる。"}
        </span>
        <div className="cn-probabilities">
          <div>
            <span>Z軸測定</span>
            <span>
              0: {(v.p0 * 100).toFixed(1)}% · 1: {(v.p1 * 100).toFixed(1)}%
            </span>
            <div className="cn-probability-bar" aria-hidden="true">
              <i style={{ width: `${v.p0 * 100}%` }} />
            </div>
          </div>
          <div>
            <span>X軸測定</span>
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
        棒の黒い部分は最初の結果（0または+）、灰色は2つ目の結果（1または−）の確率だ。各測定の確率は、同じ状態を毎回新しく用意して測るときの割合を表す。1粒子を2方向で同時に測る図ではない。
      </p>
      <p>
        θを90°に固定してφを0°から180°へ変えると、2状態はそれぞれ次のようになる。
      </p>
      <Equation name="bloch-plus-minus" />
      <p>
        2つの式で、|0⟩と|1⟩の係数の大きさは同じだ。だからZ軸で測ると、どちらも半々になる。しかし、この2状態はX軸測定の基底状態そのものだ。X軸で測れば、最初は+、2つ目は−が確実に出る。
      </p>
      <p>
        つまり、1つの測定基準での確率だけでは、量子状態を完全には区別できない。相対位相が変われば、別の基準で測る確率も変わりうる。同じ大きさの振幅でも位相によって強め合ったり打ち消し合ったりするので、量子干渉を理解するうえでも重要な違いだ。
      </p>

      <h4>なぜ球面なのだろうか</h4>
      <p>
        ここは先ほどのヒルベルト空間につながる。1つの量子ビットは、2次元複素ヒルベルト空間の状態ベクトルで表される。
      </p>
      <Equation name="bloch-column" />
      <p>
        複素数2つには、実数成分が全部で4つある。しかし正規化条件で自由度が1つ減り、観測で区別できない全体位相を除くと、独立な実数パラメーターは2つだけ残る。それらをθとφで表せば、球面上の1点に対応させられる。
      </p>
      <p>
        球面の高さzはcosθで、Z軸の「0の確率−1の確率」に対応する。両確率の和は1なので、0の確率は(1+cosθ)/2だ。半角公式を使えば、先ほどのcos²(θ/2)になる。状態を表す式にθ/2が現れる理由だ。ヒルベルト空間の説明にあった係数平面の角度と、この球面のθは同じ角度ではない。
      </p>
      <p>
        この球は物理空間に存在する球ではなく、量子状態を表す数学的な地図だ。もう1つ区別したいことがある。
      </p>
      <ul>
        <li>球面上：1つの状態ベクトルで指定する純粋状態。</li>
        <li>球の内部：異なる純粋状態を確率的に混ぜた混合状態。</li>
        <li>ちょうど中心：2つの基底状態を半々に混ぜた完全混合状態I/2。</li>
      </ul>
      <p>
        たとえば|0⟩か|1⟩をそれぞれ50%で選んで用意すると、中心に位置する。これは赤道上の純粋状態|+⟩とは異なる。Z軸では両方とも半々だが、X軸では中心の混合状態はなお半々で、|+⟩では+が100%になる。重ね合わせと、確率的に混ぜた状態も区別する必要がある。
      </p>
      <p>
        混合状態まで含めた球全体を、ブロッホボール（Bloch
        Ball）と呼ぶこともある。上の操作は球面上の純粋状態を扱う。平面図で表面の点が円の内側に見えることと、実際に球内部の混合状態であることは違う。
      </p>

      <h4>では、パーマーの不変集合理論ではなぜこの球面を使うのか</h4>
      <p>
        本文に最も直接つながる部分を見よう。通常の量子力学では、球面上のすべての点が数学的に許される純粋な量子ビット状態だ。一方、パーマーは、より根本的な状態空間に追加の幾何学的制約があると仮定する。
      </p>
      <p>
        そのモデルは、ブロッホ球面の状態表現を有限長のビット列、離散化した角度、フラクタルな不変集合につなげる。重要なのは、通常の量子力学で数学的に表せる状態でも、彼の仮定する根本的な状態空間では、すべてが実現可能とは限らないという考えだ。
      </p>
      <p>
        すると、粒子の隠れた状態をそのままにして「測定条件だけを変えていたら？」という問いも見直すことになる。その変更で作った状態の組み合わせが、モデルの不変集合内にとどまるかを先に問う必要があるからだ。
      </p>
      <p>
        ただし、ブロッホ球面そのものがフラクタルという意味ではない。球面は標準的な量子状態の表現で、パーマーの離散化と不変集合構造は、そこへ別に提案された仮説だ。実際の自然がその制約に従うと、実験で確立されたわけではない。
      </p>
      <p>
        ここまでをつなげると、ヒルベルト空間は量子状態を表す数学的空間、基底ベクトルはその状態を表す基準だ。ブロッホ球面は、そのうち単一量子ビットの状態を3次元の図に移す道具である。パーマーの研究は、私たちの使う数学的な状態表現と、実際の世界が取りうる根本的な状態の間に、どんな違いがあるかを問う試みなのだ。
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
          <span>さらに読む</span>
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
