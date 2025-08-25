// Background script to manage side panel behavior
// Shortcut: Ctrl+Shift+S (Command+Shift+S on Mac) to open the side panel
console.log("Background script loaded, initializing...");
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).then(() => {
  console.log("Side panel behavior set successfully.");
}).catch((error) => {
  console.error("Error setting side panel behavior:", error);
});

// Listen for command execution to manually open the side panel
chrome.commands.onCommand.addListener((command) => {
  console.log("Command received:", command);
  if (command === "_execute_action") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        const windowId = tabs[0].windowId;
        chrome.sidePanel.open({ windowId: windowId }).then(() => {
          console.log("Side panel opened via command.");
        }).catch((error) => {
          console.error("Error opening side panel:", error);
        });
      } else {
        console.error("No active tabs found.");
      }
    });
  } else {
    console.log("Unknown command:", command);
  }
});