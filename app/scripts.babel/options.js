const jpDefaultOptions = {
  transparency: 0.9,
  theme: "jp-theme-dark",
  autoOpenConsole: false,
  preserveConsoleSize: false
};

document.getElementById("transparency").addEventListener("change", function (event) {
  document.getElementById("transparencyValue").innerText = event.target.value;
});

// Saves options to chrome.storage.sync.
function saveOptions() {
  const transparency = document.getElementById("transparency").value;
  const theme = document.getElementById("theme");
  const autoOpen = document.getElementById("autoOpen").checked;
  const keepSize = document.getElementById("keepSize").checked;
  const options = {
    transparency: (transparency / 100),
    theme: theme.value,
    autoOpenConsole: autoOpen,
    preserveConsoleSize: keepSize
  };
  chrome.storage.local.set(options, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    if (chrome.runtime.lastError) {
      status.textContent = chrome.runtime.lastError;
    } else {
      status.textContent = "Options saved.";
    }

    status.style.display = "block";
    setTimeout(() => {
      status.textContent = "";
      status.style.display = "none";
    }, 2000);
  });

}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.local.get(jpDefaultOptions, (options) => {
    document.getElementById("transparencyValue").innerText = document.getElementById("transparency").value = (options.transparency * 100);
    document.getElementById("theme").value = options.theme;
    document.getElementById("autoOpen").checked = options.autoOpenConsole;
    document.getElementById("keepSize").checked = options.preserveConsoleSize;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
