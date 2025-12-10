
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

async function getClearAfterCopy() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["clearAfterCopy"], (result) => {
            resolve(result.clearAfterCopy === true);
        });
    });
}

async function setClearAfterCopy(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ clearAfterCopy: !!value }, () => resolve());
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
    chrome.tabs.sendMessage(tabId, { type: "SHOW_TOAST", message });
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

        const clearAfter = await getClearAfterCopy();

        chrome.tabs.sendMessage(tab.id, { type: "COPY_BUFFER", text: buffer });

        if (clearAfter) {
            await setBuffer("");
            showToastInTab(tab.id, "Multi Copy: copied & cleared buffer.");
        } else {
            showToastInTab(tab.id, "Multi Copy: combined text copied.");
        }
    } else if (command === "clear_buffer") {
        await setBuffer("");
        showToastInTab(tab.id, "Multi Copy: buffer cleared.");
    } else if (command === "toggle_clear_mode") {
        const current = await getClearAfterCopy();
        const next = !current;
        await setClearAfterCopy(next);
        const msg = next
            ? "Multi Copy: will clear buffer after combined paste."
            : "Multi Copy: will keep buffer after combined paste.";
        showToastInTab(tab.id, msg);
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
