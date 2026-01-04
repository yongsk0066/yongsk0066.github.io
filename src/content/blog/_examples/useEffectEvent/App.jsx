import { useState, useEffect } from "react";
import { useEffectEvent } from "react";
import { createConnection } from "./chat.js";
import { showNotification } from "./notifications.js";

const serverUrl = "https://localhost:1234";

function ChatRoom({ roomId, theme }) {
  const onConnect = useEffectEvent(() => {
    showNotification("연결 성공!", theme);
  });
  const onDisconnect = useEffectEvent(() => {
    showNotification("연결 끊김!", theme);
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
  }, [roomId]);

  return <h1>환영합니다 {roomId} 채팅방에 오신걸!!</h1>;
}

export default function App() {
  const [roomId, setRoomId] = useState("general");
  const [isDark, setIsDark] = useState(false);
  return (
    <>
      <label>
        Choose the chat room:{" "}
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
        Use dark theme
      </label>
      <hr />
      <ChatRoom roomId={roomId} theme={isDark ? "dark" : "light"} />
    </>
  );
}
