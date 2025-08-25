export const storage = {
  get: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },
  set: (items) => {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  },
};

export const saveDarkMode = (value) => {
  return storage.set({ darkMode: value });
};

export const loadDarkMode = async () => {
  const darkMode = await storage.get('darkMode');
  return darkMode === true;
};

export const saveQuote = (quote) => {
  return storage.set({ quote });
};

export const loadQuote = () => {
  return storage.get('quote');
};

export const saveAppState = (state) => {
  return storage.set({ appState: state });
};

export const loadAppState = () => {
  return storage.get('appState');
};
