import { useState, useEffect } from "react";
import { createConnection } from "./chat.js";
import { showNotification } from "./notifications.js";

const serverUrl = "https://localhost:1234";

function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on("connected", () => {
      showNotification("接続しました！", theme);
    });
    connection.connect();
    return () => {
      showNotification("切断されました！", theme);
      connection.disconnect();
    };
  }, [roomId, theme]); // themeが変わるたびに再接続される！

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
