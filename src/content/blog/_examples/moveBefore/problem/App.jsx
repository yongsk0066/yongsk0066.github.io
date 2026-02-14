import { useState, useRef } from "react";

export default function App() {
  const [showToast, setShowToast] = useState(false);
  const dialogRef = useRef(null);

  const openModal = () => dialogRef.current?.showModal();
  const closeModal = () => dialogRef.current?.close();

  const showToastFor3s = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div>
      <h3>문제: Toast가 Modal에 가려짐</h3>
      <p>Modal 밖에서 Toast → 잘 보임</p>
      <p>Modal 안에서 Toast → 가려짐!</p>
      <hr />
      <button onClick={showToastFor3s}>Toast 띄우기</button>{" "}
      <button onClick={openModal}>Modal 열기</button>

      <dialog ref={dialogRef}>
        <h4>Modal (Top Layer)</h4>
        <p>여기서 Toast를 띄우면 가려집니다.</p>
        <button onClick={showToastFor3s}>Toast 띄우기</button>{" "}
        <button onClick={closeModal}>닫기</button>
      </dialog>

      {showToast && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          padding: "12px 20px",
          background: "#333",
          color: "#fff",
          zIndex: 9999999,
        }}>
          Toast! (z-index: 9999999)
        </div>
      )}
    </div>
  );
}
