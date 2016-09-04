console.log("\"Allo \"Allo! Option");


const jpDefaultOptions = {
  transparency: 0.9,
  theme: "jp-theme-dark",
  autoOpenConsole: false
};

// Saves options to chrome.storage.sync.
function saveOptions() {
  const transparency = document.getElementById("transparency").value;
  const theme = document.getElementById("theme");
  const options = {
    transparency: transparency,
    theme: theme.value
  };
  chrome.storage.sync.set(options, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 750);
  });

}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get(jpDefaultOptions, (options) => {
    document.getElementById("transparency").value = options.transparency;
    document.getElementById("theme").value = options.theme;
    console.log("options restored");
    console.log(options);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click",
  saveOptions);
