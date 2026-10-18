# 참고문헌 작성

출처 정보를 한 번 선언하고, 본문에서는 이름으로 인용한다. `defineReferences`에 적은 순서대로 번호가 붙는다. 본문에 처음 등장하는 순서로 출처를 적으면 된다. 순서를 바꿔도 인용 번호와 목록 번호가 함께 바뀐다.

```mdx
import Citation from "../../components/blog/Citation.astro";
import References from "../../components/blog/References.astro";
import { defineReferences } from "../../components/blog/references";

export const references = defineReferences({
  epr: {
    title:
      "Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?",
    authors: "Einstein, Podolsky & Rosen",
    year: 1935,
    url: "https://doi.org/10.1103/PhysRev.47.777",
  },
});

EPR 논문은 양자역학의 완전성을 물었다.<Citation source={references.epr} />

### references

<References sources={references} />
```

- 필수 정보는 `title`이다. `authors`, `year`, `publication`, `url`은 필요한 만큼 적는다. 책처럼 웹 링크가 없는 자료도 가능하다.
- 선언은 import 아래나 참고문헌 제목 위에 둘 수 있다. 제목은 MDX 헤딩으로 남겨야 글 목차에도 표시된다.
- 같은 출처를 반복해서 인용할 때는 두 번째부터 `occurrence={2}`, `occurrence={3}`을 붙인다. 번호는 같고, HTML ID는 중복되지 않는다. 목록의 ↩는 첫 인용으로 돌아간다.
- 인용 이름 `epr`은 `#ref-epr`, `#cite-epr` 링크에 쓰인다. 발행 뒤에는 이름을 유지한다. 기존 글을 옮길 때는 `id: "1"`처럼 이전 앵커를 지정해 `#ref-1` 링크를 보존할 수 있다.
- 본문 인용 없는 읽을거리 목록은 `<References sources={references} backlinks={false} />`로 작성한다. 다른 언어의 글에서는 `label="References"`처럼 접근성 이름도 바꿀 수 있다.
- 영문·일문 하위 폴더의 글에서는 import 경로에 `../`를 하나 더 붙인다.

실물은 `/design#references`에서 확인할 수 있다. 브라우저 스크립트 없이 정적 HTML과 앵커 링크로 작동한다.

## 표현 기준

블로그의 흰 지면, 무채색, 얇은 구분선과 Pretendard 본문 서체를 따른다. 제목을 먼저 읽고 저자·연도를 확인하도록 두 줄로 구분한다. 번호는 정렬된 별도 열에 두고, 출처를 따라간 뒤 본문으로 돌아오는 링크를 제공한다.

[Distill의 참고문헌](https://distill.pub/2020/communicating-with-interactive-articles/)의 제목·서지 정보 위계를 참고했다. 문헌 목록과 인용·복귀 링크에는 [W3C DPUB-ARIA](https://www.w3.org/TR/dpub-aria-1.1/#doc-bibliography)의 역할을 적용한다. 모든 웹 글에 단일한 인용 양식이 있는 것은 아니며, 이 블로그에서는 기존 숫자 인용 방식을 이어 쓴다.
