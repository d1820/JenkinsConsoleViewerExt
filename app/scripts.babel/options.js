console.log("\"Allo \"Allo! Option");

// Saves options to chrome.storage.sync.
function save_options() {
  const color = document.getElementById("color").value;
  const likesColor = document.getElementById("like").checked;
  chrome.storage.sync.set({
    favoriteColor: color,
    likesColor: likesColor
  }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(()=> {
      status.textContent = "";
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = "red" and likesColor = true.
  chrome.storage.sync.get({
    favoriteColor: "red",
    likesColor: true
  }, (items)=> {
    document.getElementById("color").value = items.favoriteColor;
    document.getElementById("like").checked = items.likesColor;
  });
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click",
    save_options);
