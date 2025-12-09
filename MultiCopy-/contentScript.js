function showToast(text) {
  if (!document.body) return;

  const existing = document.getElementById("__multi_copy_toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "__multi_copy_toast";
  toast.textContent = text;

  Object.assign(toast.style, {
    position: "fixed",
    right: "16px",
    top: "16px",
    zIndex: "2147483647",
    background: "rgba(0, 0, 0, 0.85)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "4px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    opacity: "0",
    transition: "opacity 0.2s ease-out"
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 1500);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SELECTION") {
    const selection = window.getSelection().toString();
    chrome.runtime.sendMessage({
      type: "ADD_TO_BUFFER",
      text: selection
    });
  }

  if (message.type === "COPY_BUFFER") {
    const text = message.text || "";
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error("Clipboard write failed:", err);
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (e) {
        console.error("execCommand copy failed:", e);
      }
      document.body.removeChild(textarea);
    }
  }

  if (message.type === "SHOW_TOAST") {
    showToast(message.message || "");
  }
});