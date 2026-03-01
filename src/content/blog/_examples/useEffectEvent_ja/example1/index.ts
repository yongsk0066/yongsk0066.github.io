import App from "./App.jsx?raw";
import chat from "./chat.js?raw";
import notifications from "./notifications.js?raw";
import styles from "./styles.css?raw";

export default {
  "/App.js": App,
  "/chat.js": chat,
  "/notifications.js": notifications,
  "/styles.css": { code: styles, hidden: true },
};
