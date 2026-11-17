import {
  defaultLabels,
  type PlaygroundLabels,
} from "@yongsk0066/reploom-ui/react";

export type Locale = "ko" | "en" | "ja";
type ArticleLabels = PlaygroundLabels & { javascript: string };

export const labels: Record<Locale, ArticleLabels> = {
  en: {
    ...defaultLabels,
    javascript: "Enable JavaScript to run and edit this example.",
  },
  ko: {
    tools: "프로젝트 도구",
    files: "파일",
    path: "대상 경로",
    addFile: "파일 추가",
    moveFile: "선택한 파일 이동",
    removeFile: "선택한 파일 삭제",
    projectSnapshot: "저장 및 복원",
    includeState: "명시적으로 등록한 실행 상태 포함",
    saveProject: "프로젝트 저장",
    restoreSaved: "저장한 프로젝트 복원",
    openProject: "프로젝트 파일 열기",
    runTests: "격리된 테스트 실행",
    checkTypes: "타입 검사",
    loading: "예제를 불러오는 중…",
    rerun: "다시 실행",
    reset: "코드 초기화",
    resetDescription:
      "원래 코드로 되돌리고 미리보기를 다시 시작할까요? 수정한 코드와 현재 실행 상태가 사라집니다.",
    confirmReset: "원래 코드로 복원",
    cancel: "취소",
    rerunHint: "현재 코드로 다시 실행합니다. 미리보기의 상태는 초기화됩니다.",
    view: "보기 방식",
    code: "코드",
    split: "함께 보기",
    expand: "펼치기",
    collapse: "접기",
    help: "편집 안내",
    file: "파일",
    preview: "미리보기",
    edit: "코드 편집",
    editorFallback:
      "코드 편집기를 불러오지 못해 기본 텍스트 편집기를 사용합니다.",
    javascript: "JavaScript를 켜면 예제를 실행하고 편집할 수 있습니다.",
    source: (path) => `${path} 코드`,
    console: (count) => `콘솔 (${count})`,
    hint: (runtime) =>
      runtime === "compute"
        ? "별도 Worker에서 실행합니다. 중지하거나 시간이 초과되면 상태가 초기화됩니다."
        : runtime === "dom"
          ? "편집 시 명시적인 상태 객체를 유지합니다. 다시 실행하면 초기화됩니다."
          : "호환되는 편집은 상태를 유지합니다. Hook 구조를 바꾸면 상태가 초기화될 수 있습니다.",
    status(state) {
      switch (state.phase) {
        case "loading":
          return "예제를 불러오는 중…";
        case "starting":
          return "변경 내용을 적용하는 중…";
        case "compiling":
          return "변경 내용을 컴파일하는 중…";
        case "disposed":
          return "예제를 종료했습니다.";
        case "editing":
          return state.reason === "composition"
            ? "글자 조합을 기다리는 중…"
            : "편집 내용을 기다리는 중…";
        case "error":
          return state.requiresRestart
            ? "다시 편집하면 미리보기가 재시작됩니다."
            : state.stage === "load"
              ? "예제를 불러오지 못했습니다."
              : state.stage === "compile"
                ? "컴파일 오류가 있습니다. 마지막 미리보기를 유지합니다."
                : "실행 중 오류가 발생했습니다.";
        case "ready":
          return {
            initial: "실행 중",
            styles: "스타일 적용 · 상태 유지",
            refreshed: "변경 내용 적용 완료",
            remounted:
              "컴포넌트를 다시 마운트했습니다. 일부 상태가 초기화될 수 있습니다.",
            recovered: "오류 복구 완료",
            computed: "계산 완료",
            cancelled: "계산 중지",
          }[state.outcome];
      }
    },
  },
  ja: {
    tools: "プロジェクトツール",
    files: "ファイル",
    path: "保存先のパス",
    addFile: "ファイルを追加",
    moveFile: "選択したファイルを移動",
    removeFile: "選択したファイルを削除",
    projectSnapshot: "保存と復元",
    includeState: "明示的に登録した実行状態を含める",
    saveProject: "プロジェクトを保存",
    restoreSaved: "保存したプロジェクトを復元",
    openProject: "プロジェクトファイルを開く",
    runTests: "独立したテストを実行",
    checkTypes: "型チェック",
    loading: "サンプルを読み込み中…",
    rerun: "再実行",
    reset: "コードをリセット",
    resetDescription:
      "元のコードに戻して再実行しますか？編集内容と現在の実行状態は失われます。",
    confirmReset: "元のコードに戻す",
    cancel: "キャンセル",
    rerunHint:
      "現在のコードで再実行します。プレビューの状態はリセットされます。",
    view: "表示方法",
    code: "コード",
    split: "両方",
    expand: "広げる",
    collapse: "縮める",
    help: "編集について",
    file: "ファイル",
    preview: "プレビュー",
    edit: "コードを編集",
    editorFallback:
      "コードエディターを読み込めないため、テキストエディターを使用します。",
    javascript: "JavaScriptを有効にするとサンプルを実行・編集できます。",
    source: (path) => `${path} のコード`,
    console: (count) => `コンソール (${count})`,
    hint: (runtime) =>
      runtime === "compute"
        ? "別のWorkerで実行します。停止やタイムアウトで状態がリセットされます。"
        : runtime === "dom"
          ? "編集時は明示的な状態オブジェクトを維持し、再実行でリセットします。"
          : "互換性のある編集では状態を維持します。Hookの構造変更でリセットされる場合があります。",
    status(state) {
      switch (state.phase) {
        case "loading":
          return "サンプルを読み込み中…";
        case "starting":
          return "変更を適用中…";
        case "compiling":
          return "変更をコンパイル中…";
        case "disposed":
          return "サンプルを終了しました。";
        case "editing":
          return state.reason === "composition"
            ? "文字の確定を待機中…"
            : "編集を待機中…";
        case "error":
          return state.requiresRestart
            ? "編集するとプレビューを再起動します。"
            : state.stage === "load"
              ? "サンプルを読み込めませんでした。"
              : state.stage === "compile"
                ? "コンパイルエラーがあります。前のプレビューを維持しています。"
                : "実行時エラーが発生しました。";
        case "ready":
          return {
            initial: "実行中",
            styles: "スタイル更新・状態維持",
            refreshed: "変更を適用しました",
            remounted:
              "再マウントしました。一部の状態がリセットされた可能性があります。",
            recovered: "エラーから復旧しました",
            computed: "計算完了",
            cancelled: "計算停止",
          }[state.outcome];
      }
    },
  },
};
