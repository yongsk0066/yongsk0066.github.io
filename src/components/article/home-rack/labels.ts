import { devices } from "./model";

export type RackLabels = {
  photoAlt: string;
  caption: string;
  model: string;
  interaction: string;
  scene: string;
  deviceSelection: string;
  viewOptions: string;
  fixed: string;
  reassemble: string;
  pullOut: string;
  lineView: string;
  screen: string;
  roles: Record<string, string>;
};

export const rackLabels = {
  ko: {
    photoAlt: "AP, 게이트웨이, 스위치, KVM, Mac mini와 NAS를 모아 둔 홈 랙",
    caption: "새로 맞춘 홈 랙.",
    model: "홈 랙 구성",
    interaction: "홈 랙 구성: 기기를 선택하면 분리해서 볼 수 있습니다",
    scene: "실제 제품 외형을 반영한 홈 랙",
    deviceSelection: "장비 선택",
    viewOptions: "보기 설정",
    fixed: "고정",
    reassemble: "다시 조립",
    pullOut: "분리해서 보기",
    lineView: "가는 선",
    screen: "Comet X 화면: 192.0.2.10, Port1–Port4",
    roles: Object.fromEntries(devices.map(({ id, role }) => [id, role])),
  },
  en: {
    photoAlt: "Home rack housing an AP, gateway, switch, KVM, Mac mini, and NAS",
    caption: "The new home rack.",
    model: "Home rack layout",
    interaction: "Home rack: select a device to pull it out for a closer look",
    scene: "Home rack modeled after the actual devices",
    deviceSelection: "Select a device",
    viewOptions: "View options",
    fixed: "Fixed in place",
    reassemble: "Reassemble",
    pullOut: "Pull out",
    lineView: "Line view",
    screen: "Comet X display: 192.0.2.10, Port1–Port4",
    roles: {
      ap: "Wi-Fi 7 · 10GbE / PoE++",
      gateway: "Gateway · central status display",
      switch: "8 × RJ45 · 2 × SFP+",
      patch: "0.5U patch panel shown in the photo",
      comet: "4-channel KVM · 3.69″ display",
      mini: "Compute · two front USB-C ports",
      nas: "Storage · four drive bays",
    },
  },
  ja: {
    photoAlt: "AP、ゲートウェイ、スイッチ、KVM、Mac mini、NASを収めたホームラック",
    caption: "新しく揃えたホームラック。",
    model: "ホームラックの構成",
    interaction: "ホームラック：機器を選ぶと取り出して見ることができます",
    scene: "実際の機器の外観を再現したホームラック",
    deviceSelection: "機器を選択",
    viewOptions: "表示設定",
    fixed: "固定",
    reassemble: "組み直す",
    pullOut: "取り出して見る",
    lineView: "線画",
    screen: "Comet Xの画面：192.0.2.10、Port1–Port4",
    roles: {
      ap: "Wi-Fi 7 · 10GbE / PoE++",
      gateway: "ゲートウェイ · 中央ステータス画面",
      switch: "8 × RJ45 · 2 × SFP+",
      patch: "写真の0.5Uパッチパネル",
      comet: "4チャンネルKVM · 3.69インチ画面",
      mini: "コンピュート · 前面USB-Cポート×2",
      nas: "ストレージ · ドライブベイ×4",
    },
  },
} satisfies Record<string, RackLabels>;

export type RackLocale = keyof typeof rackLabels;
