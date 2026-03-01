import { useState, useEffect } from "react";
import { useEffectEvent } from "react";
import { createConnection } from "./chat.js";
import { showNotification } from "./notifications.js";

const serverUrl = "https://localhost:1234";

function ChatRoom({ roomId, theme }) {
  const onConnect = useEffectEvent(() => {
    showNotification("接続しました！", theme);
  });
  const onDisconnect = useEffectEvent(() => {
    showNotification("切断されました！", theme);
  });

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on("connected", () => {
      onConnect();
    });
    connection.connect();
    return () => {
      onDisconnect();
      connection.disconnect();
    };
  }, [roomId]); // useEffectEventでthemeの問題が解決！

  return <h1>{roomId}ルームへようこそ！</h1>;
}

export default function App() {
  const [roomId, setRoomId] = useState("general");
  const [isDark, setIsDark] = useState(false);
  return (
    <>
      <label>
        チャットルームを選択：{" "}
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="general">general</option>
          <option value="travel">travel</option>
          <option value="music">music</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={isDark}
          onChange={(e) => setIsDark(e.target.checked)}
        />
        ダークテーマを使用
      </label>
      <hr />
      <ChatRoom roomId={roomId} theme={isDark ? "dark" : "light"} />
    </>
  );
}
