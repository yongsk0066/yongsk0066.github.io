import { useState, useRef, useEffect } from "react";

function moveElement(element, targetParent) {
  if (!element || !targetParent) return;
  if (element.parentElement === targetParent) return;

  if ("moveBefore" in targetParent) {
    targetParent.moveBefore(element, null);
  } else {
    targetParent.appendChild(element);
  }
}

function useToastMover(toastRef, dialogRef) {
  const originalParentRef = useRef(null);

  useEffect(() => {
    const toast = toastRef.current;
    const dialog = dialogRef.current;
    if (!toast || !dialog) return;

    if (!originalParentRef.current) {
      originalParentRef.current = toast.parentElement;
    }

    const onToggle = () => {
      if (dialog.open) {
        moveElement(toast, dialog);
      } else {
        moveElement(toast, originalParentRef.current);
      }
    };

    dialog.addEventListener("toggle", onToggle);
    return () => dialog.removeEventListener("toggle", onToggle);
  }, []);
}

export default function App() {
  const [showToast, setShowToast] = useState(false);
  const dialogRef = useRef(null);
  const toastRef = useRef(null);

  useToastMover(toastRef, dialogRef);

  const openModal = () => dialogRef.current?.showModal();
  const closeModal = () => dialogRef.current?.close();

  const showToastFor3s = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const supportsMoveBefore = typeof document !== "undefined" && "moveBefore" in document.body;

  return (
    <div>
      <h3>해결: Toast를 Dialog 안으로 이동</h3>
      <p>{supportsMoveBefore ? "✅ moveBefore 지원" : "⚠️ appendChild fallback"}</p>
      <hr />
      <button onClick={showToastFor3s}>Toast 띄우기</button>{" "}
      <button onClick={openModal}>Modal 열기</button>

      <dialog ref={dialogRef} style={{ overflow: "visible" }}>
        <h4>Modal (Top Layer)</h4>
        <p>Toast가 Dialog 안으로 이동해서 보입니다.</p>
        <button onClick={showToastFor3s}>Toast 띄우기</button>{" "}
        <button onClick={closeModal}>닫기</button>
      </dialog>

      <div ref={toastRef}>
        {showToast && (
          <div style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "12px 20px",
            background: "#333",
            color: "#fff",
          }}>
            Toast!
          </div>
        )}
      </div>
    </div>
  );
}
