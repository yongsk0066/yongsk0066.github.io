import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

function moveElement(element, targetParent) {
  if (element.parentElement === targetParent) return;

  if (typeof targetParent.moveBefore === "function") {
    targetParent.moveBefore(element, null);
  } else {
    targetParent.appendChild(element);
  }
}

export function useToastHost() {
  const dialogRef = useRef(null);
  const [portal, setPortal] = useState(null);

  useEffect(() => {
    const ownerDocument = dialogRef.current?.ownerDocument ?? document;
    const originalParent = ownerDocument.body;
    const host = ownerDocument.createElement("div");

    originalParent.appendChild(host);
    setPortal({ host, originalParent });

    return () => {
      host.remove();
    };
  }, []);

  const attachDialog = useCallback(
    (dialog) => {
      if (!dialog) return;
      dialogRef.current = dialog;

      if (portal) {
        moveElement(
          portal.host,
          dialog.matches(":modal") ? dialog : portal.originalParent
        );
      }

      return () => {
        if (portal?.host.parentNode === dialog) {
          moveElement(portal.host, portal.originalParent);
        }
        if (dialogRef.current === dialog) {
          dialogRef.current = null;
        }
      };
    },
    [portal]
  );

  const prepareClose = useCallback(
    (event) => {
      const dialog = event.currentTarget;
      if (event.target !== dialog || event.newState !== "closed" || !portal)
        return;

      moveElement(portal.host, portal.originalParent);
    },
    [portal]
  );

  const syncParent = useCallback(
    (event) => {
      const dialog = event.currentTarget;
      if (event.target !== dialog || !portal) return;

      moveElement(
        portal.host,
        dialog.matches(":modal") ? dialog : portal.originalParent
      );
    },
    [portal]
  );

  return {
    toastHost: portal?.host ?? null,
    dialogRef,
    attachDialog,
    prepareClose,
    syncParent,
  };
}

export default function App() {
  const [toastId, setToastId] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef(null);
  const { toastHost, dialogRef, attachDialog, prepareClose, syncParent } =
    useToastHost();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const openModal = () => dialogRef.current?.showModal();
  const closeModal = () => dialogRef.current?.close();

  const showToastFor6s = () => {
    clearTimeout(timerRef.current);
    setToastId((id) => id + 1);
    setShowToast(true);
    timerRef.current = setTimeout(() => setShowToast(false), 6000);
  };

  const supportsMoveBefore =
    toastHost && typeof toastHost.moveBefore === "function";

  return (
    <div>
      <style>{`
        @keyframes toast-countdown {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
      <h3>해결: Toast를 Dialog 안으로 이동</h3>
      <p>
        {supportsMoveBefore
          ? "moveBefore 지원: 진행 막대가 이어집니다."
          : "appendChild fallback: 이동 시 진행 막대가 다시 시작됩니다."}
      </p>
      <hr />
      <button onClick={showToastFor6s}>Toast 띄우기</button>{" "}
      <button onClick={openModal}>Modal 열기</button>
      <dialog
        ref={attachDialog}
        onBeforeToggle={prepareClose}
        onToggle={syncParent}
        onClose={syncParent}
        style={{ overflow: "visible" }}
      >
        <h4>Modal (Top Layer)</h4>
        <p>Toast가 Dialog 안으로 이동해서 보입니다.</p>
        <button onClick={showToastFor6s}>Toast 띄우기</button>{" "}
        <button onClick={closeModal}>닫기</button>
      </dialog>
      {toastHost &&
        createPortal(
          showToast && (
            <div
              key={toastId}
              style={{
                position: "fixed",
                top: 20,
                right: 20,
                padding: "12px 20px",
                background: "#333",
                color: "#fff",
                zIndex: 9999999,
                pointerEvents: "none",
              }}
            >
              Toast!
              <div
                style={{
                  height: 3,
                  marginTop: 8,
                  background: "#8ee3ac",
                  transformOrigin: "left",
                  animation: "toast-countdown 6s linear forwards",
                }}
              />
            </div>
          ),
          toastHost
        )}
    </div>
  );
}
