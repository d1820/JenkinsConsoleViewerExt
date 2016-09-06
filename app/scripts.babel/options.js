const jpDefaultOptions = {
  transparency: 0.9,
  theme: "jp-theme-dark",
  autoOpenConsole: false
};

document.getElementById("transparency").addEventListener("change", function (event) {
  document.getElementById("transparencyValue").innerText = event.target.value;
});

// Saves options to chrome.storage.sync.
function saveOptions() {
  const transparency = document.getElementById("transparency").value;
  const theme = document.getElementById("theme");
  const autoOpen = document.getElementById("autoOpen").checked;
  const options = {
    transparency: (transparency/100),
    theme: theme.value,
    autoOpenConsole: autoOpen
  };
  console.log(options);
  chrome.storage.sync.set(options, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
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
  chrome.storage.sync.get(jpDefaultOptions, (options) => {
    document.getElementById("transparencyValue").innerText = document.getElementById("transparency").value = (options.transparency*100);
    document.getElementById("theme").value = options.theme;
    document.getElementById("autoOpen").checked = options.autoOpenConsole;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
