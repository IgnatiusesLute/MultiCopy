async function getBuffer() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["multiCopyBuffer"], (result) => {
      resolve(result.multiCopyBuffer || "");
    });
  });
}

async function setBuffer(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ multiCopyBuffer: value }, () => resolve());
  });
}

function isSpecialPage(url) {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("brave://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://")
  );
}

function showToastInTab(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(
    tabId,
    { type: "SHOW_TOAST", message },
    () => {
      if (chrome.runtime.lastError) {
        // console.warn(chrome.runtime.lastError.message);
      }
    }
  );
}

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (isSpecialPage(tab.url)) {
    showToastInTab(tab.id, "Multi Copy: cannot run on this page.");
    return;
  }

  if (command === "add_selection") {

    chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
  } else if (command === "copy_combined") {
    const buffer = await getBuffer();
    if (!buffer) {
      showToastInTab(tab.id, "Multi Copy: buffer is empty.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "COPY_BUFFER", text: buffer });

    showToastInTab(tab.id, "Multi Copy: combined text copied.");
  } else if (command === "clear_buffer") {
    await setBuffer("");
    showToastInTab(tab.id, "Multi Copy: buffer cleared.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_TO_BUFFER") {
    (async () => {
      const current = await getBuffer();
      const newPart = (message.text || "").trim();
      if (!newPart) {
        if (sender.tab && sender.tab.id) {
          showToastInTab(sender.tab.id, "Multi Copy: no text selected.");
        }
        return;
      }

      const combined = current ? current + " " + newPart : newPart;
      await setBuffer(combined);

      if (sender.tab && sender.tab.id) {
        showToastInTab(sender.tab.id, "Multi Copy: added to buffer.");
      }
    })();

    return true;
  }
});