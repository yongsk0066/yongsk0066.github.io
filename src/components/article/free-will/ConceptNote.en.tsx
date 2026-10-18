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
    title: "The EPR Paper",
    subtitle: "Accurate predictions versus a complete description",
    lead: "EPR stands for the last names of its three authors: Einstein, Podolsky, and Rosen. Their central question was: 'Does quantum mechanics capture physical reality without leaving anything out?'",
    sources: [["1935 EPR Paper", "https://doi.org/10.1103/PhysRev.47.777"]],
  },
  bell: {
    title: "Bell's Inequality",
    subtitle:
      "Does the coin-in-a-box explanation still hold when measurement directions change?",
    lead: "Bell's inequality is a mathematical condition that tests whether nature can be explained solely through classical causality. If two distant particles answer using only information they carried in advance, there is an unbreakable limit to how their outcomes can relate.",
    sources: [
      ["Bell, 1964", "https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195"],
      ["CHSH, 1969", "https://doi.org/10.1103/PhysRevLett.23.880"],
      ["Hensen et al., 2015", "https://arxiv.org/abs/1508.05949"],
    ],
  },
  chsh: {
    title: "The CHSH Inequality",
    subtitle:
      "Why pre-arranged answers cap at 75%, and how entanglement differs",
    lead: "The CHSH inequality is a form of Bell's inequality. It makes it possible to experimentally test the explanation that two particles respond using only local information they carried in advance. What is fascinating is that quantum mechanics actually crosses that limit.",
    sources: [
      ["CHSH Paper", "https://doi.org/10.1103/PhysRevLett.23.880"],
      [
        "IBM Quantum · CHSH Game",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/chsh-game",
      ],
    ],
  },
  guiding: {
    title: "The Guiding Equation",
    subtitle:
      "How the current wave function and position determine the next motion",
    lead: "The de Broglie–Bohm guiding equation mathematically expresses the idea that a particle has an actual position and trajectory, and that its motion is determined by the wave function.",
    sources: [
      [
        "Berndl et al. · A Survey on Bohmian Mechanics",
        "https://arxiv.org/abs/quant-ph/9504010",
      ],
      [
        "Goldstein · Bohmian Mechanics",
        "https://plato.stanford.edu/entries/qm-bohm/",
      ],
    ],
  },
  hilbert: {
    title: "Hilbert Space and Basis Vectors",
    subtitle:
      "Why the same state is expressed differently depending on the basis",
    lead: "Hilbert space and basis vectors are essential concepts for understanding quantum mechanics.",
    sources: [
      [
        "IBM Quantum · State Vectors and Basis",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM Quantum · Multiple Systems and Entanglement",
        "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/multiple-systems/quantum-information",
      ],
      [
        "'t Hooft · Cellular Automaton Interpretation",
        "https://arxiv.org/abs/1405.1548",
      ],
      [
        "MIT · Inner Products and Completeness (p. 72)",
        "https://ocw.mit.edu/courses/18-102-introduction-to-functional-analysis-spring-2021/8fb8d5c170f1613151aca71de21027bc_MIT18_102s21_full_lec.pdf#page=72",
      ],
    ],
  },
  attractor: {
    title: "Attractors and Strange Attractors",
    subtitle:
      "Why long-term prediction remains hard even when trajectories gather into the same structure",
    lead: "Attractors and strange attractors help clarify why determinism and predictability are not the same thing.",
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
        "MIT · Strange Attractors",
        "https://ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec19.pdf",
      ],
      [
        "MIT · Lorenz Equations",
        "https://live.ocw.mit.edu/courses/12-006j-nonlinear-dynamics-chaos-fall-2022/mit12_006jf22_lec20-21.pdf",
      ],
    ],
  },
  cantor: {
    title: "Fractals and the Cantor Set",
    subtitle:
      "Zero total length, yet points remain and small parts repeat the whole structure",
    lead: "The Cantor set is a fractal created by endlessly removing the middle third of a line segment. Even without intricate drawings, it shows what it means for a small part to repeat the structure of the whole.",
    sources: [
      [
        "Shuyi Weng · Construction of the Cantor Set (Sec. 2.2)",
        "https://e.math.cornell.edu/people/belk/projects/ShuyiWeng.pdf",
      ],
      [
        "Scott Sutherland · Cantor Sets and Self-Similarity",
        "https://www.math.stonybrook.edu/~scott/papers/Book331/Cantor_sets.html",
      ],
    ],
  },
  bloch: {
    title: "The Bloch Sphere",
    subtitle:
      "Why the same 50:50 probability can represent different quantum states",
    lead: "The Bloch sphere is a mathematical tool that visualizes the pure quantum state of a single qubit as a point on the surface of a 3D sphere.",
    sources: [
      [
        "IBM Quantum · Bloch Sphere",
        "https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits",
      ],
      [
        "IBM · Reading Phase and States on the Sphere",
        "https://quantum.cloud.ibm.com/docs/en/guides/composer",
      ],
      [
        "IBM Quantum · Pure States and the Bloch Ball",
        "https://quantum.cloud.ibm.com/learning/en/courses/general-formulation-of-quantum-information/density-matrices/bloch-sphere",
      ],
      [
        "Palmer · Discretization of the Bloch Sphere (2020)",
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
        Is saying that quantum mechanics predicts experimental results well the
        same as saying it is a complete description of nature? If a theory fails
        to capture properties that actually exist, its explanation might still
        be missing something even when its predictions are right. This was where
        the three authors raised their question.
      </p>
      <p>
        Suppose two particles interact and then travel far apart. In the
        idealized state EPR considered, the difference between their positions
        and the sum of their momenta are fixed. Measuring the position of one
        allows you to calculate the position of the other, and measuring the
        momentum of one allows you to calculate the momentum of the other.
      </p>
      <p>
        Now, if we accept locality, whatever we choose to measure on this side
        should not instantaneously alter the actual state of the distant
        particle. If we can know a value with certainty without disturbing the
        other particle at all, shouldn't that value be regarded as a property
        the particle already had, rather than something newly created by the
        measurement? This was EPR's criterion for physical reality.
      </p>
      <p>
        Suppose I choose between measuring position and measuring momentum. If I
        choose position, I conclude the distant particle already has a definite
        position; if I choose momentum, I conclude it already has a definite
        momentum. In practice, I measure only one of the two. Yet if what
        properties the distant particle possesses does not depend on my choice,
        EPR argued, that particle must possess both values all along.
      </p>
      <p>
        However, a quantum mechanical wave function cannot assign simultaneously
        exact values to both the position and momentum of a single particle.
        Following the reasoning above, the actual particle has both values, yet
        the wave function does not contain all of that information. Thus, the
        three authors concluded that the wave function alone cannot completely
        describe physical reality.
      </p>
      <p>
        Still, this conclusion relies both on locality—that a distant particle
        is not instantaneously changed by my measurement—and on the premise that
        any value predictable with certainty must correspond to an actual
        property. Bell's theorem later begins by asking whether any local
        explanation can reproduce all the correlations predicted by quantum
        mechanics.
      </p>
    </>
  );
}

function Bell() {
  return (
    <div className="cn-lesson">
      <p>
        Proposed by John Stewart Bell in 1964 and extended into a more widely
        testable form by CHSH in 1969, this inequality addressed a fundamental
        question. Let's first look at why such an inequality was needed.
      </p>

      <h4>Can coins in boxes explain it?</h4>
      <p>
        Imagine placing two coins into separate boxes—one showing heads, the
        other tails. Making sure their states cannot change, we keep one box on
        Earth and send the other to Mars.
      </p>
      <p>What if we open the box on Earth and find heads?</p>
      <p>
        Without even opening the box on Mars, we know it is tails—{" "}
        <strong>
          because both outcomes were fixed before the boxes were opened.
        </strong>
      </p>
      <p>
        Einstein wondered whether quantum entanglement could be explained in a
        similar way: particles carry information we do not know from the start,
        and measurement outcomes simply follow from that information. Such
        additional information is called a "hidden variable."
      </p>
      <p>Bell, however, asked one more question here:</p>
      <blockquote>
        <p>
          If particles answer using pre-existing information, and the distant
          partner's measurement choice does not alter that answer, isn't there a
          mathematical rule their outcomes must obey?
        </p>
      </blockquote>
      <p>And he actually found that rule.</p>

      <h4>Measuring spin along three directions</h4>
      <p>
        Suppose we send a pair of entangled spin-1/2 particles to Alice and Bob,
        one each. Here we use a state that{" "}
        <strong>
          always yields opposite outcomes when measured along the same direction
        </strong>
        . It is the singlet state with total spin 0, written as follows:
      </p>
      <Equation name="bell-singlet" />
      <p>
        Each person chooses one of the three directions below to measure their
        particle. The outcome is either +1 or −1.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 265"
          role="img"
          aria-label="Measurement direction A is 0 degrees, B is 60 degrees, and C is 120 degrees. The angle between A and B and between B and C is 60 degrees each, and between A and C is 120 degrees."
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
        <figcaption>
          A–B and B–C differ by 60°, and A–C differs by 120°.
        </figcaption>
      </figure>
      <p>
        If we explain this with local hidden variables, we can think of each
        particle as having pre-decided how to answer a question along each
        direction. For example, an answer sheet like this is possible:
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>An example of a possible pre-arranged answer sheet</caption>
          <thead>
            <tr>
              <th scope="col">Direction</th>
              <th scope="col">Alice's Particle</th>
              <th scope="col">Bob's Particle</th>
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
        Since asking along the same direction must always give opposite results,
        Bob's answers are the opposite of Alice's. Other answer sheets are
        certainly possible, but in every case, the answers to the three
        questions must form a single consistent table.
      </p>

      <h4>This answer sheet has an unavoidable constraint</h4>
      <p>
        Look at Alice's answers first. If the answers for A and C are different,
        at least one of the following two must hold:
      </p>
      <ul>
        <li>The answers for A and B are different.</li>
        <li>The answers for B and C are different.</li>
      </ul>
      <p>
        Because if A equals B and B equals C, then A and C must also be equal.
        In the table above, A and C differ, while B in between equals A and
        differs from C.
      </p>
      <p>
        The same holds when we gather many such answer sheets. Since every case
        where A and C differ is included in at least one of the other two cases,
        its probability cannot exceed the sum of the two probabilities.
      </p>
      <Equation name="bell-answers" />
      <p>
        Here A, B, and C are the answers Alice's particle has pre-set for each
        direction. It does not mean we measure a single particle along all three
        directions at once.
      </p>
      <p>Then how do we test this relationship in a two-particle experiment?</p>
      <p>
        In the table above, Alice's A is +1 and C is −1. Meanwhile, Bob's C is
        +1. So "Alice's A and C are different" can be restated as "when we ask
        Alice A and Bob C, their two answers are the same."
      </p>
      <p>
        Applying the condition that the two answers are opposite along the same
        direction to the other pairs as well turns the relation into an
        inequality comparing actual measurement records:
      </p>
      <Equation name="bell-bound" />
      <p>
        Here P(same) is the probability that both people obtain the same
        outcome. We run the experiment with a fresh pair of particles each time
        and assume the choice of direction is made independently of the
        particles' hidden information. Under these conditions, any pre-arranged
        answer model must obey the relation above.
      </p>

      <h4>Yet quantum mechanics crosses this limit</h4>
      <p>
        Let's calculate the singlet state |Ψ⁻⟩ prepared earlier using quantum
        mechanics. If the angle between the two measurement directions is θ, the
        probability of getting the same outcome in this state is:
      </p>
      <Equation name="bell-quantum" />
      <p>Plugging in the three directions above gives:</p>
      <div className="cn-table-wrap">
        <table>
          <caption>Probabilities predicted by quantum mechanics</caption>
          <thead>
            <tr>
              <th scope="col">Directions</th>
              <th scope="col">Angle Difference</th>
              <th scope="col">Probability of Same Outcome</th>
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
        For these numbers to satisfy the inequality above, the following
        relation would have to hold:
      </p>
      <div className="cn-lesson-result">
        <Equation name="bell-substitution" />
        <p>
          <strong>
            However, 0.75 is greater than 0.50. This relation does not hold.
          </strong>
        </p>
      </div>
      <p>
        This is the core of Bell inequality violation. No matter how you design
        pre-arranged answer sheets or in what proportions you mix them, you
        cannot produce these three probabilities together. Yet quantum mechanics
        predicts that such correlations are possible.
      </p>

      <h4>So what did we learn about nature?</h4>
      <p>
        A violation of the inequality does not immediately mean "nothing is
        determined before measurement." More precisely, it means that no
        explanation keeping all of the following conditions together can
        reproduce the observed correlations:
      </p>
      <ul>
        <li>
          <strong>Local causality.</strong> Measurement outcomes at each
          location and the relationship between them are explained by local
          causes and information in their common past.
        </li>
        <li>
          <strong>Measurement independence.</strong> The choice of which
          direction to measure is statistically independent of the hidden
          variables assigned to the particles.
        </li>
        <li>
          Measurements yield recordable outcomes, and standard probability rules
          apply.
        </li>
      </ul>
      <p>
        Which condition to keep and which to modify is a separate question.
        Non-local deterministic interpretations exist, and violating the
        inequality does not enable faster-than-light communication.
      </p>
      <p>
        What is fascinating is that even the explanation "we just don't know the
        answers yet" now faces an experimentally testable limit. Rather than the
        idea of hidden information itself,{" "}
        <strong>
          the question is whether that information can operate locally and still
          explain all quantum correlations
        </strong>
        .
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
        The name comes from the four authors of the 1969 paper: Clauser, Horne,
        Shimony, and Holt.
      </p>

      <h4>From Bell's Inequality to CHSH</h4>
      <p>
        The earlier Bell example used the condition that outcomes along the same
        direction are perfectly opposite. Introduced in 1969, the CHSH
        inequality extended Bell's argument so it could be tested even without
        that condition.
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">Comparison</th>
              <th scope="col">Earlier Bell Inequality Example</th>
              <th scope="col">CHSH Inequality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Measurement choices</th>
              <td>Three directions A, B, C</td>
              <td>Two directions for each observer</td>
            </tr>
            <tr>
              <th scope="row">Same-direction outcomes</th>
              <td>Assumed always opposite</td>
              <td>Applies without that assumption</td>
            </tr>
            <tr>
              <th scope="row">What it tests</th>
              <td colSpan={2}>
                The limit of correlations explainable by local hidden variables
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        CHSH is not a separate phenomenon, but a form designed to test the same
        problem more broadly. Actual experiments have observed results exceeding
        the limit of such local models.
      </p>

      <p>Let's look at why this limit arises through a simple game.</p>

      <h4>A game of asking two people questions</h4>
      <p>
        Suppose there are two people, Alice and Bob. They are far apart and
        cannot communicate during the game, though they can coordinate their
        strategy as much as they like beforehand.
      </p>
      <p>Each person randomly receives one of two questions:</p>
      <ul>
        <li>Alice receives A₀ or A₁</li>
        <li>Bob receives B₀ or B₁</li>
      </ul>
      <p>
        Upon receiving a question, they must{" "}
        <strong>answer with 0 or 1.</strong> Each person knows only their own
        question and not what the other was asked.
      </p>
      <p>The winning rules are as follows:</p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Alice's Question</th>
              <th scope="col">Bob's Question</th>
              <th scope="col">Winning Condition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A₀</td>
              <td>B₀</td>
              <td>Both answers must be the same</td>
            </tr>
            <tr>
              <td>A₀</td>
              <td>B₁</td>
              <td>Both answers must be the same</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₀</td>
              <td>Both answers must be the same</td>
            </tr>
            <tr>
              <td>A₁</td>
              <td>B₁</td>
              <td>Both answers must be different</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        All four question pairs occur with equal probability, and the choice of
        questions is independent of any information the two shared in advance.
      </p>
      <p>
        An interesting problem arises here:{" "}
        <strong>
          no matter what answers they pre-arrange, they cannot satisfy all four
          conditions at once.
        </strong>
      </p>

      <h4>Why is 75% the maximum win rate?</h4>
      <p>
        To satisfy the first condition, the answers for A₀ and B₀ must be the
        same.
      </p>
      <p>
        The second condition requires A₀ and B₁ to be the same, and the third
        requires A₁ and B₀ to be the same.
      </p>
      <p>
        Follow the three solid lines in the diagram below. Ultimately,{" "}
        <strong>all four questions must have the same answer.</strong> Yet the
        final dashed line demands that the answers for A₁ and B₁ be different.
        Both demands cannot be met at the same time.
      </p>
      <figure className="cn-lesson-figure">
        <div
          className="cn-game-diagram"
          role="group"
          aria-label="Pre-arranged answers for the four CHSH questions"
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
              aria-label={`${i < 2 ? "Alice" : "Bob"}'s ${name} answer ${answers[i]}, click to toggle`}
              aria-pressed={answers[i] === 1}
              onClick={() =>
                setAnswers((current) =>
                  current.map((v, j) => (i === j ? 1 - v : v))
                )
              }
            >
              <span>{name}</span>
              <small>Ans {answers[i]}</small>
            </button>
          ))}
        </div>
        <figcaption>
          Solid lines: answers must match · Dashed line: answers must differ
          <br />
          Bold lines indicate combinations that fail under the current answer
          sheet.
        </figcaption>
      </figure>
      <p className="cn-task" id="chsh-task">
        Clicking the four nodes toggles each answer between 0 and 1. First, try
        clicking "Only A₁ = 1." When you fix the last condition, where does the
        failure move? Try changing the other answers as well to see if all four
        lines can ever be satisfied at once.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="CHSH answer examples"
      >
        <button type="button" onClick={() => setAnswers([0, 0, 0, 0])}>
          All 0
        </button>
        <button type="button" onClick={() => setAnswers([0, 1, 0, 0])}>
          Only A₁ = 1
        </button>
      </div>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          {wins.filter(Boolean).length} of 4 conditions met · Win rate{" "}
          {probability * 100}%
        </strong>
        <span className="cn-observation">
          Failing combination: {pairs.filter((_, i) => !wins[i]).join(", ")}
        </span>
      </div>
      <p>
        In an actual round of the game, only one of the four question pairs is
        asked. The diagram above applies the same answer sheet to all four cases
        at once.
      </p>
      <p>
        Whichever answer sheet you pick, it fails on at least one condition. If
        all four pairs occur with equal probability, the best you can do is win
        3 out of 4—that is, <strong>75%</strong>.
      </p>
      <p>
        Using a different answer sheet each time or sharing random numbers in
        advance changes nothing. Since no single answer sheet exceeds 75%, any
        average mixing them cannot exceed 75% either.
      </p>

      <h4>Yet in quantum mechanics, about 85.4% is possible</h4>
      <p>
        Now suppose that instead of pre-arranged answers, the two hold one
        entangled particle each.
      </p>
      <p>
        Depending on the question received, each person chooses which direction
        to measure their particle and answers with the resulting outcome. In
        this game, the "question" is the measurement direction and the "answer"
        is the measurement outcome.
      </p>
      <p>
        Where does the number 85.4% come from? There are several kinds of
        entangled states. While the earlier Bell example used |Ψ⁻⟩, which gives
        opposite outcomes along the same direction, for this game we prepare the
        |Φ⁺⟩ state below:
      </p>
      <Equation name="chsh-state" />
      <p>
        All measurement axes from here on are chosen within the X–Z plane. In
        this plane, |Φ⁺⟩ is a state that yields the same outcome when measured
        along the same direction. If the angle between the two measurement axes
        is θ, the probabilities in this state are:
      </p>
      <Equation name="chsh-probabilities" />
      <p>
        The reason sin²(θ/2) earlier and cos²(θ/2) here differ is that we
        prepared a different entangled state. Along the same direction (θ = 0°),
        the earlier state always gave different outcomes, whereas this state
        always gives the same outcome in the X–Z plane.
      </p>
      <p>
        Setting the Z-axis as 0°, let's fix Alice's measurement axis at 0° for
        A₀ and 90° for A₁, and Bob's at 45° for B₀ and −45° for B₁. The first
        three combinations differ by 45°, while only the last combination
        differs by 135°.
      </p>
      <div className="cn-table-wrap">
        <table>
          <caption>
            Spin measurement axis angles and winning conditions for each pair
          </caption>
          <thead>
            <tr>
              <th scope="col">Question Pair</th>
              <th scope="col">Angle Difference</th>
              <th scope="col">Winning Condition</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A₀ · B₀</th>
              <td>45°</td>
              <td>Same answer</td>
            </tr>
            <tr>
              <th scope="row">A₀ · B₁</th>
              <td>45°</td>
              <td>Same answer</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₀</th>
              <td>45°</td>
              <td>Same answer</td>
            </tr>
            <tr>
              <th scope="row">A₁ · B₁</th>
              <td>135°</td>
              <td>Different answer</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Since the first three combinations require the same answer, we plug 45°
        into the first probability formula. Simplifying with the half-angle
        identity gives:
      </p>
      <Equation name="chsh-same" />
      <p>
        Since the last combination requires different answers, we plug 135° into
        the second formula. Because 67.5° and 22.5° add up to 90°, this
        probability equals the previous one:
      </p>
      <Equation name="chsh-different" />
      <p>
        In the end,{" "}
        <strong>
          all four combinations win with a probability of about 85.4%.
        </strong>{" "}
        Since each of the four combinations is chosen with probability 1/4, the
        overall win rate is also their average: about 85.4%.
      </p>
      <div
        className="cn-bars"
        role="img"
        aria-label="Maximum win rate comparison: classical local strategy 75%, quantum strategy using entanglement about 85.4%"
      >
        <div>
          <span>Classical local strategy</span>
          <b>75.0%</b>
          <i style={{ width: "75%" }} />
        </div>
        <div>
          <span>Quantum strategy with entanglement</span>
          <b>85.4%</b>
          <i style={{ width: `${(0.5 + Math.SQRT2 / 4) * 100}%` }} />
        </div>
      </div>
      <p>Does that mean the earlier logic was wrong?</p>
      <p>
        No. Earlier, we assumed that even answers to unasked questions could be
        written down together in a single table beforehand. The statistics
        obtained from quantum measurements simply cannot be reproduced no matter
        how you mix such local answer sheets.
      </p>
      <p>
        The interactive diagram above shows the limit of pre-arranged answers.
        85.4% is not a number found by discovering a cleverer answer sheet in
        that diagram; it is a value calculated from the measurement rules of
        quantum mechanics.
      </p>

      <h4>Writing this game as a formula gives the CHSH inequality</h4>
      <p>
        Let's label measurement outcomes as +1 and −1 instead of 0 and 1. If E
        is the average of the product of the two outcomes, E approaches +1 when
        matching answers occur more often, and −1 when opposite answers occur
        more often.
      </p>
      <p>
        The subscripts denote the question pairs. We add the first three pairs
        because they require matching answers, and subtract the last pair
        because it requires opposite answers:
      </p>
      <Equation name="chsh" />
      <p>
        In any local hidden variable model, S cannot exceed 2. In quantum
        mechanics, however, it can reach:
      </p>
      <Equation name="quantum" />
      <p>
        This upper bound is called the Tsirelson bound. It connects directly to
        the <strong>maximum win rate</strong> achievable in the game:
      </p>
      <Equation name="winning" />
      <p>
        Plugging in the local bound of 2 gives 75%, and plugging in the quantum
        bound of 2√2 gives about 85.4%. The game and the inequality express the
        exact same limit in different ways.
      </p>

      <h4>What this game tells us about nature</h4>
      <p>
        If two particles answer using only local information they carried in
        advance, and measurement choices are independent of that information,
        there is an unbreakable limit. Actual experiments have observed
        correlations that surpass that limit.
      </p>
      <p>
        That does not mean faster-than-light communication is possible or that
        all determinism is false. Rather, we must examine which assumptions can
        be held together.
      </p>
      <p>
        Herein lies the appeal of CHSH:{" "}
        <strong>
          it turned the explanation "they just matched their answers beforehand"
          into something testable by numbers.
        </strong>{" "}
        And nature goes beyond the limit that explanation allows.
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
      <p>
        What makes this theory intriguing is that it asserts three things
        together:
      </p>
      <ul>
        <li>Particles have actual positions even before measurement.</li>
        <li>The motion of particles is fundamentally deterministic.</li>
        <li>
          Even so, in quantum equilibrium, it predicts the exact same
          experimental results as standard quantum mechanics.
        </li>
      </ul>
      <p>
        Recalling Bell's inequality from earlier, doesn't this sound like a
        contradiction? However, what Bell's theorem rules out is not all
        determinism, but the idea that quantum correlations can be explained
        solely by local hidden variables. Because Bohmian mechanics explicitly
        accepts non-locality, it does not contradict Bell's result.
      </p>
      <p>
        Proposed by de Broglie in 1927 and independently rediscovered and
        systematized by Bohm in 1952, how does this approach determine a
        particle's motion, and how do the probabilities of quantum mechanics
        emerge from deterministic motion? We will also revisit the condition of
        "quantum equilibrium" attached to the third claim along the way.
      </p>

      <h4>Adding the particle's actual position to the wave function</h4>
      <p>
        In standard quantum mechanics, a particle's state is represented by the
        wave function ψ, which is used to calculate the probability of finding
        the particle at each position.
      </p>
      <p>
        De Broglie–Bohm theory adds the{" "}
        <strong>actual position Q(t) of the particle</strong>. Rather than only
        appearing at some location upon measurement, a particle is viewed as
        actually being somewhere even before it is measured.
      </p>
      <p>
        Let's separate the wave function from the particle's position. The wave
        function evolves according to the Schrödinger equation, while the
        particle's position changes according to a velocity calculated from that
        wave function. This second rule is the guiding equation.
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">Element</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Wave function ψ</th>
              <td>
                Carries information that determines how the particle moves.
              </td>
            </tr>
            <tr>
              <th scope="row">Actual position Q(t)</th>
              <td>Represents where the particle actually is at time t.</td>
            </tr>
            <tr>
              <th scope="row">Guiding equation</th>
              <td>
                Calculates the instantaneous velocity from the wave function and
                actual position.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The key is that the wave function is not merely used to calculate the
        probability of finding a particle, but also governs the actual
        particle's motion. Thinking of it like a physical water wave pushing a
        particle along, however, would be inaccurate; the wave function is a
        mathematical object that assigns a complex number to each position.
      </p>

      <h4>What does the guiding equation calculate?</h4>
      <p>
        Consider a single spinless particle first, setting aside relativistic
        effects and magnetic fields. In this case, the guiding equation is:
      </p>
      <Equation name="guiding" />
      <p>
        With so many symbols, it may look intimidating. Let's look first at what
        the equation is solving for. On the left, dQ/dt is the velocity of the
        particle. The right side shows how to compute that velocity from the
        wave function and the current position. Breaking down each symbol gives:
      </p>
      <div className="cn-table-wrap">
        <table className="cn-comparison-table">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Q(t)</th>
              <td>Actual position of the particle at time t</td>
            </tr>
            <tr>
              <th scope="row">dQ/dt</th>
              <td>
                Velocity at which the particle's position changes over time
              </td>
            </tr>
            <tr>
              <th scope="row">ψ</th>
              <td>Wave function</td>
            </tr>
            <tr>
              <th scope="row">∇ψ</th>
              <td>
                Spatial derivative showing how the wave function changes with
                position
              </td>
            </tr>
            <tr>
              <th scope="row">Im</th>
              <td>Operation taking the imaginary part of a complex number</td>
            </tr>
            <tr>
              <th scope="row">ℏ</th>
              <td>Planck's constant h divided by 2π</td>
            </tr>
            <tr>
              <th scope="row">m</th>
              <td>Mass of the particle</td>
            </tr>
            <tr>
              <th scope="row">x=Q(t)</th>
              <td>
                Evaluates the right-hand calculation at the particle's actual
                position
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        In short, this equation means:{" "}
        <strong>
          inspect the wave function where the particle currently is, and compute
          its velocity there.
        </strong>
      </p>
      <p>
        Compare this with familiar Newtonian mechanics, where the equation of
        motion uses force to find acceleration:
      </p>
      <Equation name="guiding-newton" />
      <p>
        The guiding equation directly specifies <strong>velocity itself</strong>
        , rather than acceleration. The position changes following that
        velocity, and at the next position, the velocity is computed anew from
        the wave function there. Thus, once the initial position, the initial
        wave function, and the evolution rule of the wave function are given,
        the subsequent trajectory is determined.
      </p>
      <p>
        The formula above is used where ψ is non-zero. Where ψ is 0, the
        division cannot be applied as-is and requires separate mathematical
        treatment.
      </p>

      <h4>Splitting the wave function into amplitude and phase</h4>
      <p>
        What information in the wave function actually sets the particle's
        velocity? To see this, it helps to split the wave function into two
        components.
      </p>
      <p>
        Just as a complex number can be represented by a magnitude and an angle
        on a plane, the magnitude of a wave function is called its amplitude and
        the angle its phase. Written as a formula:
      </p>
      <Equation name="guiding-phase" />
      <ul>
        <li>R is the amplitude of the wave function.</li>
        <li>
          S is a function representing the phase; in this notation, the actual
          phase angle is S/ℏ.
        </li>
      </ul>
      <p>
        Substituting this expression into the guiding equation splits ∇ψ/ψ on
        the right-hand side into two terms:
      </p>
      <Equation name="guiding-ratio" />
      <p>
        The guiding equation takes only the imaginary part here. Since ∇R/R is
        real, it drops out, leaving ∇S/ℏ from the second term. Multiplying by
        ℏ/m outside cancels ℏ, simplifying the velocity formula to:
      </p>
      <Equation name="guiding-gradient" />
      <p>
        Ultimately, what sets the particle's velocity is{" "}
        <strong>how the phase of the wave function varies across space</strong>.
        ∇S indicates how much and in what direction S changes when moving to a
        neighboring position at the same instant. Dividing that gradient by the
        mass gives the velocity at the current position.
      </p>
      <p>
        We should distinguish between the phase itself being large and the
        gradient of the phase being large. Adding the same constant to the phase
        everywhere changes the phase value, but leaves the difference between
        neighboring positions unchanged—so neither the gradient nor the
        instantaneous velocity changes.
      </p>
      <p>
        Let's look at a simple one-dimensional example. A plane wave with
        constant amplitude A can be written as follows, where k is how fast the
        phase varies with position and ω is how fast it varies with time:
      </p>
      <Equation name="guiding-plane" />
      <p>
        Comparing this with the earlier expression, S for this wave function is
        ℏ(kx−ωt). Differentiating with respect to x leaves ℏk, so the velocity
        is:
      </p>
      <Equation name="guiding-plane-speed" />
      <p>
        Since the momentum of this plane wave is p=ℏk, we recover the familiar
        classical relationship between velocity and momentum. Let's compare
        changes in phase directly in the diagram below.
      </p>
      <p className="cn-task" id="guiding-phase-task">
        First, switch the slope across "Increasing → Constant → Decreasing." How
        do the direction and magnitude of the velocity change? Next, fix the
        slope and add π/2 to the global phase. You can see that even when the
        height of the line shifts, the velocity remains unchanged.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Spatial slope of phase"
        aria-describedby="guiding-phase-task"
      >
        {[-1, 0, 1].map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={waveNumber === k}
            onClick={() => setWaveNumber(k)}
          >
            {k === -1
              ? "Decreasing k=−1"
              : k === 0
                ? "Constant k=0"
                : "Increasing k=+1"}
          </button>
        ))}
      </div>
      <div
        className="cn-controls"
        role="group"
        aria-label="Phase added to all positions"
      >
        <button
          type="button"
          aria-pressed={phaseOffset === 0}
          onClick={() => setPhaseOffset(0)}
        >
          Global phase 0
        </button>
        <button
          type="button"
          aria-pressed={phaseOffset !== 0}
          onClick={() => setPhaseOffset(Math.PI / 2)}
        >
          Global phase +π/2
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label={`Phase graph across position x. Slope ${waveNumber}, phase added to all positions ${phaseOffset === 0 ? "0" : "pi over 2"}. Velocity is ${waveNumber}.`}
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
            Phase S/ℏ
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
            Position x
          </text>
        </svg>
        <figcaption>
          Phase of a plane wave at t=0, with units set to ℏ=m=1.
          <br />
          The dot marks the phase value at x=0. When global phase is added, the
          original line is shown dashed for comparison.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          Slope k={waveNumber} · Velocity v={waveNumber}
        </strong>
        <span className="cn-observation">
          {waveNumber === 0
            ? "Since the phase does not change with position, the velocity is 0."
            : waveNumber > 0
              ? "As position increases, the phase increases, so the particle moves in the direction of increasing x."
              : "As position increases, the phase decreases, so the particle moves in the direction of decreasing x."}
          {phaseOffset !== 0 &&
            " Adding π/2 to the global phase leaves the slope and velocity unchanged."}
        </span>
      </div>
      <p>
        This does not mean the amplitude R is irrelevant to motion. Amplitude
        and phase evolve together under the Schrödinger equation. Saying that
        only the phase appears directly in the instantaneous velocity formula is
        different from saying the amplitude has no effect on subsequent motion.
      </p>

      <h4>
        Does an interference pattern still form if a particle passes through
        only one slit?
      </h4>
      <p>
        In the double-slit experiment, the respective roles of the particle and
        the wave function become even clearer. Because a particle has an actual
        position in this theory, it passes through one of the two slits.
        However, in an experiment where both slits are open and which slit it
        passed through is not recorded, the wave function evolves into a
        superposition of components passing through both slits.
      </p>
      <p>
        As the two components interfere, the spatial shape of the amplitude and
        phase changes. The particle moves according to the velocity calculated
        from that modified wave function. Its subsequent path is determined not
        merely by which slit it passed through, but by the entire wave function
        created by both slits.
      </p>
      <p>
        Repeating the experiment many times and collecting the arrival positions
        yields the quantum mechanical interference pattern. To obtain the exact
        statistics, however, we also need to account for the distribution of
        starting positions.
      </p>

      <h4>If it is deterministic, why do probabilities appear?</h4>
      <p>
        If a single particle's initial position is fixed, its path is fixed too.
        In experiments, however, we do not know that exact position every time.
        We need to specify how the starting positions are distributed to say
        what statistics will emerge across repeated trials.
      </p>
      <p>
        Letting ρ denote the probability density of position, standard "quantum
        equilibrium" uses the following distribution—the Born rule, which
        squares the magnitude of ψ to obtain the probability density of
        position:
      </p>
      <Equation name="guiding-equilibrium" />
      <p>
        A crucial property of the guiding equation is that{" "}
        <strong>
          if positions are initially distributed according to |ψ|², they
          continue to match the evolving |ψ|² at later times as well
        </strong>
        . The evolution of the wave function and the motion of the particles
        preserve the same position statistics. This property is called
        equivariance.
      </p>
      <p>
        This connects directly to the guiding equation. If j denotes the
        probability current obtained from the Schrödinger equation, the velocity
        in the guiding equation is that current divided by the density |ψ|²,
        where ψ* is the complex conjugate of ψ:
      </p>
      <Equation name="guiding-current" />
      <p>
        Because particles move at this velocity, the change in the position
        distribution matches the change in probability given by the Schrödinger
        equation. Applying this relation to include the measurement apparatus
        reproduces standard quantum measurement statistics within the scope of
        non-relativistic quantum equilibrium.
      </p>
      <p>
        Still, this does not mean just any initial distribution automatically
        becomes |ψ|². Why the quantum equilibrium distribution should be used
        requires separate statistical justification; writing down a
        deterministic law of motion does not automatically prove the Born rule.
      </p>

      <h4>Why it does not contradict Bell's inequality</h4>
      <p>
        Didn't we see earlier that local pre-existing information cannot explain
        quantum correlations? Bohmian mechanics keeps determinism while giving
        up locality. This difference appears directly in the equation when there
        are two particles.
      </p>
      <p>
        A multi-particle wave function takes the positions of all particles
        together as input. Two particles require six position coordinates, and
        the space of all possible coordinate combinations is called
        "configuration space." Let's compute the velocity of the first particle
        using this joint wave function:
      </p>
      <Equation name="guiding-pair" />
      <p>
        Here Ψ is the joint wave function taking both particle positions as
        input, and ∇₁ denotes the spatial derivative with respect to the first
        particle's position. Notice that{" "}
        <strong>
          the actual position Q₂ of the second particle enters the calculation
          of the first particle's velocity.
        </strong>
      </p>
      <p>
        If the wave function factors into separate functions for each particle,
        this dependence on the other's position vanishes; in an entangled state,
        however, it generally cannot be factored that way. The position of a
        distant particle—or the measurement apparatus over there—can participate
        in the motion over here. This is the non-locality of the theory.
      </p>
      <p>
        The formula written here is for spinless particles. To handle spin as in
        CHSH, the wave function is extended to a spinor with multiple complex
        components. While the theory takes actual particle positions as its
        basic variables, it does not pre-assign spin outcomes for every
        direction independently of the apparatus; measurement outcomes are
        determined by the interaction of the whole system, including both the
        particle and the apparatus.
      </p>
      <p>
        Furthermore, in quantum equilibrium, this non-local dependence cannot be
        used to send desired faster-than-light messages. That a law of motion
        depends on a distant variable must be distinguished from being able to
        control that dependence as a communication channel.
      </p>

      <h4>What is the quantum potential?</h4>
      <p>
        Bohm also expressed the same motion in terms of a "quantum potential."
        Splitting the wave function into amplitude and phase and substituting it
        into the Schrödinger equation introduces the following term into the
        equation for the evolution of S, where ∇²R is the second derivative
        representing the spatial curvature of the amplitude:
      </p>
      <Equation name="guiding-potential" />
      <p>
        This can be arranged as the classical Hamilton–Jacobi equation—which
        writes motion in terms of energy and changes in S—plus this additional
        term. It is a reformulation of the two equations of motion above and
        does not mean we must postulate a separate independent force or field;
        the evolution of the wave function and the guiding equation alone
        suffice to understand the particle's motion.
      </p>

      <h4>Has this theory been proven right?</h4>
      <p>
        The explanation so far does not settle how the actual universe moves.
        Producing the same experimental predictions as standard quantum
        mechanics in non-relativistic quantum equilibrium also means that those
        results alone cannot easily distinguish between the two explanations.
        Extending the theory to combine with relativity involves additional
        challenges as well.
      </p>
      <p>
        What this approach shows is that probabilistic observation outcomes in
        quantum mechanics and deterministic laws of motion do not necessarily
        contradict each other. Instead of explaining motion solely through
        causes in each particle's immediate surroundings, however, it explicitly
        accepts non-local dependence. Keeping determinism and keeping locality
        at the same time are not the same claim.
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
        In particular, de Broglie–Bohm theory, the wave function, and Bell's
        inequality discussed earlier can all be described using the mathematical
        structure of a Hilbert space.
      </p>
      <p>To state the core ideas up front:</p>
      <ul>
        <li>
          Hilbert space: a mathematical space where quantum states can be
          represented as vectors
        </li>
        <li>
          Basis vectors: reference vectors used to express any state within that
          space
        </li>
        <li>
          Wave function: one of the mathematical representations obtained when a
          quantum state vector is expressed in a specific basis
        </li>
      </ul>
      <p>Let's look at them one by one.</p>

      <h4>Understanding basis vectors first</h4>
      <p>Think of the familiar 2D coordinate plane.</p>
      <p>
        In 2D, we usually use the following two basis vectors: e₁, one unit
        horizontally, and e₂, one unit vertically.
      </p>
      <Equation name="hilbert-classical-basis" />
      <p>
        With just these two vectors, any 2D vector can be expressed. For
        example, the vector (5, 4) can be written as:
      </p>
      <Equation name="hilbert-classical-vector" />
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 260"
          role="img"
          aria-label="Coordinate plane expressing the vector (5,4) by adding 5 times the horizontal basis vector e1 and 4 times the vertical basis vector e2"
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
          The vector is single, but it can be expressed by how much of each of
          the two basis vectors it uses.
        </figcaption>
      </figure>
      <p>
        In other words, a basis is a set of independent vectors chosen so that
        every vector in the space can be expressed as a combination of them.
        "Independent" here means that none of the basis vectors can be replaced
        by a combination of the others.
      </p>
      <p>
        Basis vectors do not have to be horizontal and vertical; any two
        non-parallel vectors can span a 2D space. Choosing vectors that are
        mutually perpendicular and of length 1, however, makes calculations
        convenient. Such a basis is called an orthonormal basis.
      </p>

      <h4>How is a Hilbert space different?</h4>
      <p>Now let's extend this concept to quantum mechanics.</p>
      <p>
        Whereas the coordinate plane above used real coefficients to express
        vectors, quantum mechanics must also allow complex coefficients. In
        addition, an inner product—which calculates how much two vectors
        overlap—must be defined.
      </p>
      <p>
        Mathematically, a Hilbert space is a vector space equipped with an inner
        product that satisfies completeness. Quantum mechanics typically uses a
        complex Hilbert space.
      </p>
      <p>
        Completeness, simply put, is the property that if a sequence of vectors
        gets endlessly closer to one another as you go further out, the limit
        they approach also exists within the same space.
      </p>
      <p>
        That may sound formal, but for now it suffices to understand it as
        follows:
      </p>
      <blockquote>
        <p>
          A Hilbert space is a mathematical space designed to represent quantum
          states as vectors, allowing us to add vectors and compute inner
          products.
        </p>
      </blockquote>
      <p>
        What matters is that this space does not necessarily mean the 3D
        physical space we live in. For instance, representing only the spin
        state of an electron uses a 2D complex Hilbert space.
      </p>

      <h4>Understanding it through the spin of a single electron</h4>
      <p>
        Measuring an electron's spin along a specific axis yields one of two
        outcomes. Let's call this axis the Z-axis, and write the state
        corresponding to spin-up as |0⟩ and spin-down as |1⟩. The | ⟩ notation
        denotes a state vector.
      </p>
      <p>Written as column vectors:</p>
      <Equation name="hilbert-spin-basis" />
      <p>
        Here |0⟩ and |1⟩ are called basis states. They look identical to the 2D
        coordinate vectors earlier, but now they serve as the reference for
        expressing two spin states.
      </p>
      <p>Must the electron be in only one of these two states?</p>
      <p>No. Quantum mechanics allows a superposition of the two states:</p>
      <Equation name="hilbert" />
      <p>
        Here α and β are complex coefficients indicating how much of each basis
        vector is combined.
      </p>
      <p>
        A normalized state must satisfy the following condition, which sets the
        length of the state vector so that the probabilities of the two outcomes
        sum to 1:
      </p>
      <Equation name="hilbert-normalization" />
      <p>For example, consider the following state:</p>
      <Equation name="hilbert-example" />
      <p>
        Measuring this state along the Z-axis yields |0⟩ with 75% probability
        and |1⟩ with 25% probability, obtained by squaring the absolute value of
        each coefficient:
      </p>
      <Equation name="hilbert-born" />
      <p>
        This is the Born rule. The key point is that α and β are not
        probabilities themselves, but probability amplitudes; probabilities are
        obtained by squaring the magnitude of each coefficient.
      </p>
      <p>
        Let's verify this difference visually below, focusing on cases where
        both coefficients are non-negative real numbers.
      </p>
      <p className="cn-task" id="hilbert-state-task">
        Select "75:25" and "50:50" in turn. The reference axes stay fixed while
        the state vector changes. At 50:50, each coefficient is about 0.707,
        while its squared probability is 0.5. Compare the coefficients read via
        the dashed lines against their squared probabilities.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="State vector combination examples"
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
              ? "Only 0"
              : value === 30
                ? "75:25"
                : value === 45
                  ? "50:50"
                  : "Only 1"}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        State vector angle in the coefficient plane <output>{angle}°</output>
        <input
          aria-label="Angle of state vector coefficient combination"
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
          aria-label={`State vector relative to two fixed basis states. Alpha ${a.toFixed(3)}, Beta ${b.toFixed(3)}. Probability of 0 is ${(a * a * 100).toFixed(1)} percent, probability of 1 is ${(b * b * 100).toFixed(1)} percent.`}
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
            Plane of coefficients α, β
          </text>
        </svg>
        <figcaption>
          Horizontal and vertical axes represent the coefficients of the two
          basis states. The angle shown is measured in this coefficient plane.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {angle === 0
            ? "Only the first basis |0⟩ remains, so measuring in this basis always yields 0."
            : angle === 90
              ? "Only the second basis |1⟩ remains, so measuring in this basis always yields 1."
              : angle === 30
                ? "The coefficients are about 0.866 and 0.500; squaring them gives probabilities of 75% and 25%."
                : angle === 45
                  ? "Both coefficients are about 0.707; squaring them gives 50% probability each."
                  : "Projecting the state vector onto each reference axis gives its coefficient; squaring the magnitude gives the probability."}
        </span>
        Coefficients α ≈ {a.toFixed(3)}, β ≈ {b.toFixed(3)}
      </div>
      <div
        className="cn-probabilities"
        role="img"
        aria-label={`Probability of 0 is ${(a * a * 100).toFixed(1)} percent, probability of 1 is ${(b * b * 100).toFixed(1)} percent`}
      >
        <div>
          <span>Probability of 0: |α|² · {(a * a * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${a * a * 100}%` }} />
          </div>
        </div>
        <div>
          <span>Probability of 1: |β|² · {(b * b * 100).toFixed(1)}%</span>
          <div className="cn-probability-bar">
            <i style={{ width: `${b * b * 100}%` }} />
          </div>
        </div>
      </div>
      <p>
        In a general quantum state, complex phases also enter the two
        coefficients; the diagram above shows only the subset of states using
        real coefficients. Representing that additional phase information on a
        sphere leads to the Bloch sphere, which we will examine later.
      </p>

      <h4>Changing the basis expresses the same state differently</h4>
      <p>
        Above, we used |0⟩ and |1⟩ as our basis. However, we can also choose a
        different basis:
      </p>
      <Equation name="hilbert-other-basis" />
      <p>
        These two vectors also form an orthonormal basis—mutually orthogonal and
        of length 1.
      </p>
      <p>What happens if we express |0⟩ in this new basis?</p>
      <Equation name="hilbert-rebase" />
      <p>
        What was originally a single basis state |0⟩ is now expressed as a
        superposition of two states in the new basis. Adding |+⟩ and |−⟩ above
        confirms that the |1⟩ components cancel out, leaving only |0⟩.
      </p>
      <p>
        The actual quantum state has not changed; only the coordinate system
        used to express it has changed.
      </p>
      <p>
        If we also change the actual measurement direction, the observation
        probabilities change accordingly. Measuring the same |0⟩ state along the
        Z-axis yields |0⟩ 100% of the time, whereas measuring it along the
        X-axis yields |+⟩ and |−⟩ at 50% each. We must distinguish between
        merely writing the same state in different coordinates and actually
        performing a measurement that distinguishes a different basis.
      </p>
      <p className="cn-task" id="hilbert-basis-task">
        Below, the prepared state is fixed at |0⟩ while we switch between the
        Z-axis and X-axis measurement bases. Notice that the black state vector
        stays put; what changes are the gray basis vectors, the coefficients in
        that basis, and the probabilities when that measurement is performed.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Measurement basis for fixed state 0"
        aria-describedby="hilbert-basis-task"
      >
        <button
          type="button"
          aria-pressed={isZ}
          onClick={() => setMeasurementBasis("z")}
        >
          Z-axis basis |0⟩, |1⟩
        </button>
        <button
          type="button"
          aria-pressed={!isZ}
          onClick={() => setMeasurementBasis("x")}
        >
          X-axis basis |+⟩, |−⟩
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="60 0 520 275"
          role="img"
          aria-label={`Diagram expressing the same state 0 in the ${isZ ? "Z" : "X"} basis. The black state vector is fixed, and measurement probabilities are ${isZ ? "100 percent for 0 and 0 percent for 1" : "50 percent each for plus and minus"}.`}
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
            State |0⟩
          </text>
          {isZ ? (
            <>
              <text x="370" y="180" className="cn-lesson-angle">
                Basis |0⟩
              </text>
              <text x="240" y="25" className="cn-lesson-angle">
                Basis |1⟩
              </text>
            </>
          ) : (
            <>
              <text x="332" y="48" className="cn-lesson-angle">
                Basis |+⟩
              </text>
              <text x="332" y="247" className="cn-lesson-angle">
                Basis |−⟩
              </text>
            </>
          )}
        </svg>
        <figcaption>
          Black arrow: fixed state |0⟩ · Gray arrows: chosen basis
          <br />
          Drawn in the coefficient plane. Dashed lines show the coefficients
          projected onto the new basis.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          Prepared state |0⟩ ·{" "}
          {isZ ? "Z-axis measurement" : "X-axis measurement"}
        </strong>
        <span className="cn-observation">
          {isZ
            ? "Basis coefficients are 1 and 0. Measuring yields 0 at 100% and 1 at 0%."
            : "Each basis coefficient is 1/√2 ≈ 0.707. Measuring yields + and − at 50% each."}
        </span>
      </div>
      <p>
        This is why measurement directions matter in quantum mechanics. In the
        CHSH inequality earlier, Alice and Bob chose different measurement
        directions. Mathematically, that choice corresponds to selecting
        measurements that distinguish different basis states. Even when the same
        entangled state is prepared, the correlations between their outcomes
        change depending on which directions the two choose.
      </p>

      <h4>Treating two particles together expands the Hilbert space</h4>
      <p>
        The spin state of a single electron could be represented in a 2D complex
        Hilbert space. How do we represent the spins of two electrons together?
      </p>
      <p>
        We use the tensor product of the two spaces. Combining the two basis
        states of the first particle with the two basis states of the second
        gives four basis vectors for the joint system:
      </p>
      <Equation name="hilbert-tensor" />
      <p>
        Since each particle is 2-dimensional, the combined space is 2×2 =
        4-dimensional. For example, |01⟩ represents the state where the first
        particle is |0⟩ and the second is |1⟩. Any general two-particle state
        can be expressed as a combination of these four basis vectors.
      </p>
      <p>A special state among them is the Bell state:</p>
      <Equation name="hilbert-bell" />
      <p>
        This state cannot be written simply as a product of one particle's state
        and the other's. Multiplying two individual states that each contain 0
        and 1 components produces |01⟩ and |10⟩ terms alongside |00⟩ and |11⟩;
        it is impossible to keep only the first two terms as in the formula
        above. Such a pure state is called a quantum entangled state.
      </p>
      <p>
        Note that getting 00 and 11 half the time along the Z-axis alone does
        not confirm entanglement; to distinguish it from a classical mixture
        where 00 or 11 is prepared probabilistically, one must also check the
        statistics in other measurement bases.
      </p>
      <p>
        An important point follows: the dimension of the Hilbert space for
        multiple particles grows rapidly with the number of particles. For n
        qubits, each having two basis states like an electron spin, combining
        their basis states yields a dimension of:
      </p>
      <Equation name="hilbert-dimension" />
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Number of Qubits</th>
              <th scope="col">State Space Dimension</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 10, 20].map((n) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td>{(2 ** n).toLocaleString("en-US")}D</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Here "dimension" means the number of independent complex basis vectors,
        not an increase in the dimensions of physical space.
      </p>
      <p>
        This is also why Hilbert space frequently appears when explaining
        quantum computers. However, a rapidly growing state space dimension does
        not mean we can read out all of that information in a single
        measurement; one measurement yields only a single outcome corresponding
        to the chosen basis.
      </p>

      <h4>How does this connect to de Broglie–Bohm theory?</h4>
      <p>
        Let's connect this back to the de Broglie–Bohm guiding equation examined
        earlier.
      </p>
      <p>
        Above, we dealt with an electron's spin state. Now let's think about a
        particle's spatial state.
      </p>
      <p>
        |ψ⟩ is an abstract state vector in Hilbert space. What happens when we
        express a particle's spatial state in the position basis?
      </p>
      <Equation name="hilbert-position" />
      <p>
        It becomes the familiar wave function. On the right, ⟨x|ψ⟩ denotes the
        coefficient of the state |ψ⟩ expressed at position x.
      </p>
      <p>
        Just as a spin state was expressed by two coefficients for |0⟩ and |1⟩,
        a spatial state is expressed by coefficients corresponding to each
        position. Because position varies continuously, instead of two discrete
        coefficients we get a function of position.
      </p>
      <p>
        Strictly speaking, |x⟩ pointing to a single exact position is not an
        ordinary normalizable vector, but a generalized basis used for
        continuous positions.
      </p>
      <p>
        For a single spinless particle moving in 3D space, the wave function is
        written ψ(x, t), where x bundles the three position coordinates. Since
        the probabilities across all possible positions must sum to 1, the
        normalization condition is:
      </p>
      <Equation name="hilbert-position-norm" />
      <p>
        Instead of summing the squared magnitudes of two coefficients, here we
        integrate over all continuous positions. The representative Hilbert
        space to which such wave functions belong is L²(ℝ³), the space of
        square-integrable complex functions.
      </p>
      <p>
        The ψ appearing in the de Broglie–Bohm guiding equation is precisely
        this wave function in the position representation: we express the
        abstract Hilbert space state vector in the position basis, and then
        compute the particle's velocity from the phase gradient of that
        representation.
      </p>

      <h4>Putting the concepts together</h4>
      <p>
        A Hilbert space is an abstract mathematical space representing quantum
        states—not the physical space in which particles move around.
      </p>
      <p>
        Basis vectors serve as the coordinate system for expressing those
        states. Depending on the basis, the exact same state may be written as a
        single basis state or as a superposition of multiple basis states.
      </p>
      <p>
        A wave function is one way of expressing that state vector: expressing
        it in a spin basis gives spin measurement probabilities, while
        expressing it in a position basis gives position measurement
        probabilities. Distinguishing the physical state from the coordinates
        used to represent it is key.
      </p>

      <h4>How does this connect to the automata in the main text?</h4>
      <p>
        Now suppose we attach one basis vector to each distinguishable state of
        an automaton—mapping state A to |A⟩ and state B to |B⟩. The fact that A
        and B are distinct states is represented by the two basis vectors being
        orthogonal.
      </p>
      <p>
        If a transition swaps A to B and B to A, we can write the rule as below,
        where U is the operator applying this state transition to vectors:
      </p>
      <Equation name="hilbert-automaton" />
      <p>
        This operation is a permutation that swaps two basis vectors. Applying
        the same rule linearly to combined vectors preserves both lengths and
        inner products. A reversible operation with this property is a unitary
        operation—whereas a transition that merges multiple states into one
        irreversibly is not such a permutation.
      </p>
      <p>
        Deterministic state transitions can thus be expressed in the
        mathematical language used by quantum mechanics. Whether this
        representation is possible, however, and whether actual nature moves
        according to the rules of such an automaton, must be examined
        separately.
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
  const distanceLabel = distance.toLocaleString("en-US", {
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
      <p>To summarize the core ideas first:</p>
      <ul>
        <li>
          Attractor: a point, orbit, or set toward which many initial states
          converge as time passes.
        </li>
        <li>
          Strange attractor: an attractor that often has a fractal structure. In
          the classic Lorenz attractor, motion within it is also complex and
          aperiodic.
        </li>
      </ul>
      <p>
        What is intriguing is that while the region where motion takes place is
        bounded, predicting the exact trajectory it will follow inside that
        region over the long term can be difficult. How can both be true at
        once? Let's start with a simple example.
      </p>

      <h4>What is an attractor?</h4>
      <p>
        Imagine a ball rolling inside a bowl. Wherever you release the ball, as
        long as there is friction, it eventually settles at the bottom of the
        bowl and stops. Even when the starting position and velocity differ, the
        final state reached is the same.
      </p>
      <p>
        This state of resting at the bottom can be called an attractor. It does
        not mean only the spatial location of the bottom; it refers to the
        complete state where the ball is at the bottom and its velocity is 0.
      </p>
      <p>
        An attractor does not have to be a single resting state, however. An
        entire orbit of repeating motion can also be an attractor. To understand
        this difference, we first need to look at how motion is plotted.
      </p>

      <h4>Plotting motion in state space</h4>
      <p>
        We usually think of an object's motion in physical space. In dynamics,
        however, the state of a system is represented as a single point.
      </p>
      <p>
        For example, knowing a pendulum's position is not enough to describe its
        state. At the same position it may be moving left or right, and those
        motions lead to different next states. We therefore need its velocity as
        well as its position.
      </p>
      <Equation name="attractor-state" />
      <p>
        Here θ is the pendulum's angle and ω is its angular velocity. The space
        whose coordinates are these two values is phase space. As time passes,
        the point representing the state moves, and the line it traces is called
        a trajectory.
      </p>
      <p>
        If we plot the ball settling at the bottom in this space, trajectories
        from different starting points approach one point. A system that
        sustains a steady oscillation, on the other hand, follows the same
        closed orbit instead of coming to rest at a point.
      </p>
      <p>
        This should also be distinguished from the Hilbert space discussed
        earlier. There we represented quantum states as vectors; here our
        coordinates are classical state variables such as position and velocity.
      </p>

      <h4>Approaching one point and repeating an orbit are different</h4>
      <p>
        A pendulum subject only to friction eventually stops. A system supplied
        with energy to sustain its oscillation, however, can approach the same
        periodic orbit from different nearby states. Such a stable periodic
        orbit is called a limit cycle.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 250"
          role="img"
          aria-label="Phase-space sketches: trajectories approach a single point in a fixed-point attractor and a closed curve in a stable limit cycle."
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
            Fixed-point attractor
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
            Stable limit cycle
          </text>
        </svg>
        <figcaption>
          On the left, trajectories approach one point; on the right, they
          approach an entire closed orbit. These are phase-space sketches, not
          pictures of the ball's path through physical space.
        </figcaption>
      </figure>
      <p>
        Mathematically, we consider an invariant set that trajectories from a
        region of initial states approach over time. Invariant means that a
        state starting inside the set stays inside it. The region of initial
        states that approach an attractor is its basin of attraction.
      </p>
      <p>
        For a fixed point, it is relatively easy to describe where motion will
        stop; for a periodic orbit, which motion will repeat. The next kind of
        attractor presents a different situation.
      </p>

      <h4>A classic strange attractor: the Lorenz attractor</h4>
      <p>
        The butterfly-wing-shaped structure below is the Lorenz attractor.
        Edward Lorenz discovered it in 1963 while studying a simplified
        mathematical model of convection.
      </p>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label="A trajectory computed from the Lorenz equations over 50 model time units. This x–z projection shows the trajectory moving between two wing-shaped regions."
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
          Only x and z of the three state variables x, y, and z are projected
          onto the plane. This shows the history of a moving state, not a
          butterfly-shaped physical object.
        </figcaption>
      </figure>
      <p>
        Each line traces the state as time passes. It circles one wing several
        times, moves to the other, and then returns. The motion remains within a
        bounded region, but a typical trajectory does not repeat periodically.
      </p>
      <p>
        The rules producing this complex motion are three differential
        equations.
      </p>
      <Equation name="lorenz" />
      <p>
        Notation such as dx/dt on the left describes how each state variable
        changes with time. The parameters σ, ρ, and β are held fixed at the
        following commonly used values in the figure above.
      </p>
      <Equation name="lorenz-parameters" />
      <p>
        There are no random numbers here and no probabilistic choice of the next
        moment. An exactly specified current state determines its next change.
        Yet the long-term motion becomes highly irregular. What, then, makes
        prediction difficult?
      </p>

      <h4>Why is prediction hard when motion stays near the same attractor?</h4>
      <p>
        Consider two systems starting from almost identical initial states.
        Their trajectories initially nearly coincide, but a large difference can
        develop over time. This is sensitivity to initial conditions.
      </p>
      <p>
        Below, two trajectories are calculated using the same Lorenz equations.
        Their initial x values differ by just 0.000001, while y and z are
        identical. The parameters and external conditions remain unchanged
        throughout the calculation.
      </p>
      <p className="cn-task" id="attractor-task">
        Move the time from 0 to 10 to 20. The solid and dashed lines show the
        recent portions of the two trajectories; the filled and hollow dots show
        their states at the same instant. They initially appear to overlap, then
        occupy different positions. Compare remaining in a similar overall
        region with being in the same state at the same time.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Observation time for two nearby initial states"
        aria-describedby="attractor-task"
      >
        {[0, 10, 20, 30].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={time === value}
            onClick={() => setTime(value)}
          >
            Time {value}
          </button>
        ))}
      </div>
      <label className="cn-slider">
        Model time since observation began <output>{time.toFixed(1)}</output>
        <input
          type="range"
          min="0"
          max="30"
          step="0.1"
          value={time}
          aria-label="Observation time for two nearby Lorenz states"
          aria-describedby="attractor-task"
          onChange={(e) => setTime(+e.target.value)}
        />
      </label>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 280"
          role="img"
          aria-label={`Model time ${time}. The current distance between states whose initial x values differed by one millionth is ${distance.toExponential(2)}. The filled dot is A and the hollow dot is B; solid and dashed lines show their recent trajectories.`}
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
          A: solid line and filled dot. B: dashed line and hollow dot. The faint
          line shows the overall shape.
          <br />
          The plot is an x–z projection, while distance is calculated using all
          three variables, including the omitted y.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          Distance between the states at the same instant ≈ {distanceLabel}
        </strong>
        <span className="cn-observation">
          {time === 0
            ? "The initial difference is approximately 0.000001. At this scale, the two points appear to overlap."
            : distance < 0.1
              ? "A difference is developing, but the points are still close. Move further forward in time and compare the states at the same instant."
              : "The states move near the same attractor yet occupy different positions. Starting close together does not mean they will remain close after a long time."}
        </span>
      </div>
      <p>
        This difference does not grow at an identical rate at every moment.
        While the separation is sufficiently small, however, the following
        exponential relation describes the tendency.
      </p>
      <Equation name="attractor-sensitivity" />
      <p>
        Here δ₀ is the initial separation and δ(t) the separation after time t.
        The Lyapunov exponent λ describes how quickly nearby states separate or
        approach one another. A positive largest exponent means there is a
        direction in which small differences between nearby trajectories are
        amplified on average.
      </p>
      <p>
        This is the mathematical core of the butterfly effect. The overall
        motion stays in a bounded region, so the separation does not grow
        without limit. The figure is a numerical calculation over a finite time,
        not a mathematical proof of chaos.
      </p>

      <h4>How can separating trajectories stay near the same attractor?</h4>
      <p>
        An important question follows. If nearby trajectories separate, how can
        the motion as a whole still approach the same attractor?
      </p>
      <p>
        Contraction and expansion occur simultaneously in different directions.
        Nearby states separate in some directions while their distances shrink
        in others. The stretched trajectories also return and fold, allowing the
        overall motion to remain bounded.
      </p>
      <p>
        Approaching an attracting set is therefore different from two states
        within that set approaching each other. Both happen together for a
        fixed-point attractor. Near the Lorenz attractor, trajectories can
        approach the set while nearby trajectories within it separate.
      </p>

      <h4>Where does fractal structure enter the picture?</h4>
      <p>
        What remains when stretching, compression, and folding repeat? Instead
        of a smooth line or a single smooth surface, a structure can form in
        which additional layers and gaps appear at smaller scales.
      </p>
      <p>
        A fractal is a geometric object that reveals fine structure at
        progressively smaller scales. Some fractals repeat exactly the same
        pattern under rescaling, but not every fractal has such perfect
        self-similarity.
      </p>
      <p>
        The Lorenz attractor lies within three-dimensional phase space without
        filling it. Its layered structure has fractal properties. Simply
        magnifying a few turns of the plotted line does not reveal that full
        structure. The Cantor set in the next note provides a simpler example of
        structure that persists at smaller scales.
      </p>
      <p>
        There are several precise definitions of a strange attractor. Here,
        think of a representative case such as the Lorenz attractor, where
        fractal structure and chaotic motion occur together.
      </p>

      <h4>How, then, do determinism and prediction differ?</h4>
      <p>
        Let's return to the original question. Is saying that every event is
        determined by a previous state the same as saying an observer can
        predict the entire future exactly?
      </p>
      <p>
        In the Lorenz model, the rules of motion are deterministic, yet a small
        error in the initial state can become a large difference later. Knowing
        the initial state more precisely can extend the useful prediction time,
        but finite precision does not guarantee continuously accurate
        predictions of individual states far into the future.
      </p>
      <p>
        This does not mean nothing can be predicted. Even if it is difficult to
        say exactly when a trajectory will occupy the left wing, we can study
        the region in which the motion remains and its long-term statistical
        properties. Predictions about an individual future state and the
        structure of the overall motion are different things.
      </p>
      <p>
        Chaos theory has not proved that the entire universe is deterministic.
        It shows that deterministic mathematical rules alone can generate
        complex motion that is difficult to predict over long periods. The
        universe's invariant set discussed in the main text is likewise a
        separate physical hypothesis, not a conclusion that follows directly
        from this example.
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
        Earlier we noted that a strange attractor can have a fractal structure.
        What does "revealing finer structure even when magnified" look like
        concretely? Instead of a moving trajectory, let's start with a single
        line segment.
      </p>

      <h4>Does "fractal" simply mean a complicated shape?</h4>
      <p>
        Looking complicated alone does not make something a fractal. What
        matters is that structure continues to appear at smaller scales, and how
        that structure relates to the magnification factor.
      </p>
      <p>
        When magnifying a small part reproduces the same structure as the whole,
        that property is called self-similarity. The Cantor set illustrates this
        property cleanly. Let's look at the rule for building it first, and then
        see what repeats.
      </p>

      <h4>Removing only the middle third of a line segment</h4>
      <p>
        Start with a line segment of length 1—all points from 0 to 1. Divide it
        into three equal parts and remove the interior of the middle third. Two
        segments remain: from 0 to 1/3 and from 2/3 to 1. The boundary endpoints
        1/3 and 2/3 are left in place.
      </p>
      <p>
        Now apply the same rule to each of the two remaining segments. Removing
        the middle third of each leaves four segments of length 1/9. Next,
        remove the middle third of each of those four segments. The rule stays
        the same from start to finish.
      </p>
      <p className="cn-task" id="cantor-task">
        Click "Next step" twice. Each time a segment splits into two, the number
        of segments doubles while the total remaining length shrinks. Compare
        the black segments against the numbers below them. Every row shows the
        same 0-to-1 range.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Cantor set construction"
        aria-describedby="cantor-task"
      >
        <button
          type="button"
          onClick={() => setStage(0)}
          disabled={stage === 0}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setStage(Math.min(5, stage + 1))}
          disabled={stage === 5}
        >
          Next step
        </button>
      </div>
      <label className="cn-slider">
        Removal step <output>{stage}</output>
        <input
          aria-label="Cantor set removal step"
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
          aria-label={`Cantor set from step 0 to step ${stage}. Currently ${segments.length} segments remain, with total length ${(100 * (2 / 3) ** stage).toFixed(1)} percent of the original.`}
        >
          {Array.from({ length: stage + 1 }, (_, n) => (
            <g key={n}>
              <text x="10" y={36 + n * 34}>
                Step {n}
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
          Black bars show remaining segments; white gaps show removed intervals,
          with endpoints retained. Shown up to step 5 as an approximation.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <strong>
          {segments.length} segments · Length each{" "}
          {stage === 0 ? "1" : `1/${3 ** stage}`} · Total length{" "}
          {stage === 0 ? "1" : `${2 ** stage}/${3 ** stage}`} ≈{" "}
          {(100 * (2 / 3) ** stage).toFixed(1)}%
        </strong>
        <span className="cn-observation">
          {stage === 0
            ? "Nothing removed yet. We start with a single segment of length 1."
            : "The number of segments doubled from the previous step, while the total length shrank to 2/3 of the previous step. Segment count and total length change in opposite ways."}
        </span>
      </div>
      <p>
        When this process is repeated endlessly, the collection of points never
        removed at any step is the Cantor set. We must distinguish between the
        segments remaining at a specific finite step and the final set defined
        through an infinite process.
      </p>

      <h4>If the total length is 0, does nothing remain?</h4>
      <p>
        The total length shrinks in the sequence 1, 2/3, 4/9, 8/27. Since 2/3 of
        the previous length remains each time, the length after n steps is:
      </p>
      <Equation name="cantor-length" />
      <p>
        As the repetition continues, this value approaches 0 without bound, and
        the total length of the final Cantor set is 0. Does that mean every
        point has vanished?
      </p>
      <p>
        No. The endpoints 0 and 1 kept from the very beginning are never removed
        at any step, nor are boundary points like 1/3 and 2/3. Having length 0
        and being an empty set are two different things.
      </p>
      <p>
        Nor is it only endpoints that remain. At each step, imagine choosing
        either the left sub-segment or the right sub-segment. Continuing those
        choices narrows the interval further and further, so an endless sequence
        of left/right choices pins down a single point in the end.
      </p>
      <p>
        For instance, alternating left, right, left, right endlessly narrows
        down to the point 1/4. Summing the shifts added each time we pick the
        right sub-segment gives the series below. This point is never an
        endpoint at any step, yet it never falls into a removed middle third
        either, so it survives to the end:
      </p>
      <Equation name="cantor-quarter" />
      <p>
        There are so many such infinite sequences of choices that they cannot
        even be listed one by one with natural numbers. In that sense, the
        points of the Cantor set are uncountably infinite. How many points exist
        and how much length they occupy are separate questions.
      </p>

      <h4>What do we see when we magnify a small piece?</h4>
      <p>
        Look again at the remaining shape. Inside the first left third (from 0
        to 1/3), the exact same process of removing middle thirds was repeated,
        and likewise inside the right third. Magnifying the left third of the
        final set by a factor of 3 therefore reproduces the exact structure of
        the whole.
      </p>
      <p className="cn-task" id="cantor-zoom-task">
        Fixing the step-3 approximation below, select "Magnify left 1/3." The
        boxed region on top is stretched to the full width below. Notice how the
        small piece contains the same pattern of an empty middle splitting into
        two sides.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Cantor set self-similarity view"
        aria-describedby="cantor-zoom-task"
      >
        <button
          type="button"
          aria-pressed={!zoom}
          onClick={() => setZoom(false)}
        >
          Full view
        </button>
        <button type="button" aria-pressed={zoom} onClick={() => setZoom(true)}>
          Magnify left 1/3
        </button>
      </div>
      <figure className="cn-lesson-figure">
        <svg
          viewBox="0 0 520 215"
          role="img"
          aria-label={
            zoom
              ? "Magnifying the left third of the step-3 approximation by 3x produces the same shape as the full step-2 approximation"
              : "Shows the full step-3 approximation at the same width top and bottom. You can select the left third to magnify it."
          }
        >
          <text x="20" y="23">
            Full step-3 approximation
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
            {zoom
              ? "Left 1/3 magnified 3×"
              : "Selected full range at same scale"}
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
          The points inside the top box are drawn magnified below. Only the view
          changes; no points are created or removed.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        {zoom
          ? "Magnified the left 1/3 of the step-3 approximation by 3×. Its four segments are arranged identically to the full step-2 approximation."
          : "Full view of the step-3 approximation. Magnify the left 1/3 to see how the same splitting rule sits inside it."}
      </div>
      <p>
        In a finite-step drawing, magnifying reduces the number of remaining
        subdivision steps by one—which is why the diagram compares step 3 with
        step 2. In the final Cantor set repeated infinitely, however, there is
        no last step, so magnifying a part yields the exact same structure as
        the whole. This is the self-similarity of the Cantor set.
      </p>
      <p>
        Not every fractal repeats the exact same shape like the Cantor set, and
        the Lorenz attractor earlier does not look like this line segment
        either. This simple example illustrates the shared idea that structure
        persists down to arbitrarily small scales.
      </p>

      <h4>Why do we need this example in the main text?</h4>
      <p>
        Infinitely many points remain in the Cantor set, yet no continuous line
        segment connecting them survives. No matter how closely you zoom in
        around a remaining point, you encounter both points belonging to the set
        and removed gaps right next to them.
      </p>
      <p>
        For example, 1/3 belongs to the set, but immediately to its right lies
        the gap removed in the very first step. Moving ever so slightly from a
        point on the set does not guarantee that the new point still belongs to
        the set.
      </p>
      <p>
        What the main text draws upon is this kind of geometric constraint: if
        the set on which valid states lie does not fill the entire space,
        altering a variable slightly can land outside the set. Whether the
        Cantor set exhibits such a structure, of course, and whether the actual
        states of our universe are constrained in the same way, are separate
        questions.
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
            ? `Bloch sphere for a pure state. Theta ${t} degrees, Phi ${p} degrees. Z-axis 0 probability ${(state.p0 * 100).toFixed(1)} percent, X-axis plus probability ${((1 + state.x) * 50).toFixed(1)} percent`
            : "Structure of the Bloch sphere. North pole is 0, south pole is 1, and opposite sides of the X-axis on the equator are the plus and minus states. The tip of the arrow from the center points to a single pure state."
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
        Hilbert space and basis vectors from earlier connect directly here, and
        this concept is also needed to understand Tim Palmer's Invariant Set
        Theory in the main text. Let's first see what a point on the sphere
        represents.
      </p>

      <h4>Representing quantum states on a sphere?</h4>
      <figure className="cn-lesson-figure">
        {sphere(55, 35, false)}
        <figcaption>
          An arrow extending from the center of the sphere points to the state
          |ψ⟩. It represents a quantum state rather than a particle's physical
          location or path in space.
        </figcaption>
      </figure>
      <p>
        In the figure above, an arrow extends from the center of the sphere in a
        specific direction. The direction it points to represents the state of a
        qubit—a quantum system described by two basis states, |0⟩ and |1⟩.
      </p>
      <p>
        Let's look at a few representative states first. All probabilities below
        are for measurements along the Z-axis:
      </p>
      <div className="cn-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Position on Sphere</th>
              <th scope="col">State</th>
              <th scope="col">Z-Axis Measurement Outcome</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">North Pole (+Z)</th>
              <td>|0⟩</td>
              <td>100% 0</td>
            </tr>
            <tr>
              <th scope="row">South Pole (−Z)</th>
              <td>|1⟩</td>
              <td>100% 1</td>
            </tr>
            <tr>
              <th scope="row">Equator (+X)</th>
              <td>|+⟩</td>
              <td>50% 0, 50% 1</td>
            </tr>
            <tr>
              <th scope="row">Equator (−X)</th>
              <td>|−⟩</td>
              <td>50% 0, 50% 1</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Something looks odd here: |+⟩ and |−⟩ sit on opposite sides of the
        equator, yet both have a 50:50 probability along the Z-axis. How can
        they be different states if they give the exact same probabilities? This
        is the key to understanding the Bloch sphere.
      </p>

      <h4>Quantum states have phase in addition to probability</h4>
      <p>As we saw earlier, the state of a qubit can be written as:</p>
      <Equation name="bloch-state" />
      <p>
        Here α and β are complex coefficients satisfying the normalization
        condition:
      </p>
      <Equation name="bloch-normalization" />
      <p>
        Squaring the magnitudes of these coefficients gives the Z-axis
        measurement probabilities. Complex numbers, however, have phase as well
        as magnitude. The phase difference between the two coefficients is
        called the relative phase, which can differ even when the magnitudes of
        the coefficients are equal.
      </p>
      <p>
        A global phase multiplied equally onto both coefficients cannot be
        distinguished by measurement outcomes. Removing that redundancy allows
        us to rewrite the state as:
      </p>
      <Equation name="bloch" />
      <p>Though it looks involved, only two angles fix the state:</p>
      <ul>
        <li>
          θ (theta): how far down from the north pole the state sits, linked
          directly to the Z-axis measurement probabilities.
        </li>
        <li>
          φ (phi): how far around the Z-axis the state has rotated, representing
          the relative phase between the two basis states.
        </li>
      </ul>
      <p>
        Any pure state of a single qubit can be represented by these two angles.
        States with the same θ sit at the same height on the sphere and share
        the same Z-axis probabilities; varying φ rotates the state around the
        sphere at that fixed height.
      </p>
      <Equation name="bloch-probabilities" />
      <p>
        The factor e^(iφ) has magnitude 1 and changes only the phase: it equals
        +1 when φ = 0° and −1 when φ = 180°. Thus we can flip the relative sign
        between the two terms while keeping their coefficient magnitudes
        unchanged—which is what distinguishes the two equatorial states above.
      </p>

      <h4>Try changing the angles yourself</h4>
      <p>
        Below, adjusting θ and φ changes the prepared state, while the Z-axis
        and X-axis measurements used for comparison stay fixed. We write the two
        X-axis outcomes as + and −.
      </p>
      <p className="cn-task" id="bloch-task">
        First, select "North Pole |0⟩", "Equator |+⟩", and "South Pole |1⟩" in
        turn to check the Z-axis probabilities. Next, toggle between "Equator
        |+⟩" and "Equator |−⟩": notice how the Z-axis stays at 50:50 while the
        X-axis flips completely.
      </p>
      <div
        className="cn-controls"
        role="group"
        aria-label="Bloch state comparison"
        aria-describedby="bloch-task"
      >
        {[
          { t: 0, p: 0, label: "North Pole |0⟩" },
          { t: 90, p: 0, label: "Equator |+⟩" },
          { t: 90, p: 180, label: "Equator |−⟩" },
          { t: 180, p: 0, label: "South Pole |1⟩" },
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
          Polar angle from north pole θ <output>{theta}°</output>
          <input
            aria-label="Bloch sphere polar angle"
            aria-describedby="bloch-task"
            type="range"
            min="0"
            max="180"
            value={theta}
            onChange={(e) => setTheta(+e.target.value)}
          />
        </label>
        <label className="cn-slider">
          Azimuthal angle around Z-axis φ <output>{phi}°</output>
          <input
            aria-label="Bloch sphere azimuthal angle"
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
          The arrow tip marks the prepared pure state, and the dashed circle
          connects states sharing the same θ. Because a 3D sphere is projected
          onto a 2D plane, points on the surface can appear inside the outer
          circular outline.
        </figcaption>
      </figure>
      <div className="cn-readout" aria-live="polite" aria-atomic="true">
        <span className="cn-observation">
          {atPole
            ? "At the poles, rotating φ leaves the state unchanged. The north pole yields only 0 along Z; the south pole yields only 1."
            : isPlus
              ? "|+⟩ state. Along the Z-axis 0 and 1 are 50:50, but along the X-axis + appears 100% of the time."
              : isMinus
                ? "|−⟩ state. Along the Z-axis it is still 50:50, but along the X-axis − appears 100% of the time."
                : "Try fixing θ and varying only φ: the Z-axis probabilities stay constant while the X-axis probabilities change."}
        </span>
        <div className="cn-probabilities">
          <div>
            <span>Z-axis measurement</span>
            <span>
              0: {(v.p0 * 100).toFixed(1)}% · 1: {(v.p1 * 100).toFixed(1)}%
            </span>
            <div className="cn-probability-bar" aria-hidden="true">
              <i style={{ width: `${v.p0 * 100}%` }} />
            </div>
          </div>
          <div>
            <span>X-axis measurement</span>
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
        The dark portion of each bar shows the probability of the first outcome
        (0 or +), and the gray portion shows the second (1 or −). Each
        probability represents the proportion across many repeated preparations
        and measurements of the same state, not a simultaneous measurement of a
        single particle along two axes.
      </p>
      <p>
        Fixing θ at 90° and switching φ from 0° to 180° gives the following two
        states:
      </p>
      <Equation name="bloch-plus-minus" />
      <p>
        In both formulas, the coefficients in front of |0⟩ and |1⟩ have the same
        magnitude, so measuring along the Z-axis gives 50:50 for both. Yet these
        two states are precisely the basis states for an X-axis measurement—so
        measuring along the X-axis yields + with certainty for the first and −
        with certainty for the second.
      </p>
      <p>
        In short, probabilities in a single measurement basis cannot distinguish
        all quantum states. Changing the relative phase can alter measurement
        probabilities in other bases, and because amplitudes of equal magnitude
        can add constructively or cancel out depending on their phase, this
        difference is central to understanding quantum interference as well.
      </p>

      <h4>Why a sphere?</h4>
      <p>
        This connects back to the Hilbert space discussed earlier: a single
        qubit is represented by a state vector in a 2D complex Hilbert space.
      </p>
      <Equation name="bloch-column" />
      <p>
        Two complex numbers contain four real components in total. Normalization
        removes one degree of freedom, and setting aside the unobservable global
        phase leaves just two independent real parameters—which, when expressed
        as θ and φ, map to a point on the surface of a sphere.
      </p>
      <p>
        The height z on the sphere is cosθ, corresponding to "(probability of 0)
        − (probability of 1)" along the Z-axis. Since the two probabilities sum
        to 1, the probability of 0 is (1 + cosθ)/2, which simplifies via the
        half-angle identity to cos²(θ/2) seen earlier. This is why θ/2 appears
        in the state formula; the angle measured in the coefficient plane in the
        Hilbert space note and θ on the Bloch sphere are not the same angle.
      </p>
      <p>
        This sphere is a mathematical map of quantum states rather than a sphere
        in physical space, and there is one more distinction to keep in mind:
      </p>
      <ul>
        <li>
          Surface of the sphere: pure states specified by a single state vector.
        </li>
        <li>
          Interior of the sphere: mixed states formed by probabilistically
          mixing different pure states.
        </li>
        <li>
          Exact center: the maximally mixed state I/2, an equal mixture of two
          orthogonal basis states.
        </li>
      </ul>
      <p>
        For instance, preparing |0⟩ or |1⟩ with 50% probability each sits at the
        center of the sphere. That differs from the pure equatorial state |+⟩:
        along the Z-axis both give 50:50, but along the X-axis the mixed state
        at the center still gives 50:50 whereas |+⟩ yields + 100% of the time. A
        quantum superposition and a classical probabilistic mixture must
        therefore be distinguished.
      </p>
      <p>
        The sphere including its interior is sometimes called the Bloch ball.
        The interactive controls above move across pure states on the surface; a
        surface point appearing inside the circular boundary on a 2D projection
        should not be confused with an interior mixed state.
      </p>

      <h4>Why does Palmer's Invariant Set Theory use this sphere?</h4>
      <p>
        Now let's look at the part most directly connected to the main text. In
        standard quantum mechanics, every point on the surface of the Bloch
        sphere is a mathematically permitted pure qubit state. Palmer, however,
        hypothesizes an additional geometric constraint on a more fundamental
        state space.
      </p>
      <p>
        Palmer's model connects state representations on the Bloch sphere to
        finite-length bit strings, discretized angles, and a fractal invariant
        set. The key idea here is that even if a state can be written down
        mathematically in standard quantum mechanics, it might not be realizable
        within the fundamental state space he assumes.
      </p>
      <p>
        This forces us to re-examine counterfactual questions like "What if we
        had kept the particle's hidden state the same and only changed the
        measurement setting?"—because we must first ask whether the resulting
        combination still lies within the model's invariant set.
      </p>
      <p>
        This does not mean the Bloch sphere itself is a fractal; the sphere is
        the standard representation of quantum states, while Palmer's
        discretization and invariant set structure are a separate hypothesis
        proposed on top of it. Whether actual nature obeys such a constraint has
        not been experimentally established.
      </p>
      <p>
        Connecting the concepts so far: Hilbert space is the mathematical space
        representing quantum states, basis vectors are the reference frame used
        to express them, and the Bloch sphere is a tool that maps single-qubit
        states onto a 3D figure. Palmer's research asks what gap might exist
        between our mathematical representation of states and the fundamental
        states the actual world can take.
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
          <span>Further reading</span>
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
