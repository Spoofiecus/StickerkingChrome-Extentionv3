import { DEFAULT_VINYL_COST, DEFAULT_VAT_RATE, MIN_ORDER_AMOUNT } from './js/config.js';
import { calculatePrice } from './js/calculator.js';
import { getDOMElements, addStickerInput, renderResults, showToast } from './js/ui.js';
import { saveDarkMode, loadDarkMode, saveAppState, loadAppState } from './js/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const dom = getDOMElements();

  // --- State Initialization ---
  let appState = {
    vinylCost: DEFAULT_VINYL_COST,
    vatRate: DEFAULT_VAT_RATE,
    includeVat: false,
    darkMode: false,
    material: 'unspecified',
    roundedCorners: false,
    stickers: []
  };

  const loadedState = await loadAppState();
  if (loadedState) {
    appState = { ...appState, ...loadedState };
  }

  // --- UI Initialization ---
  dom.vinylCostInput.value = appState.vinylCost;
  dom.vatRateInput.value = appState.vatRate;
  dom.includeVatCheckbox.checked = appState.includeVat;
  dom.materialSelect.value = appState.material;
  dom.roundedCornersCheckbox.checked = appState.roundedCorners;
  dom.darkModeToggle.checked = appState.darkMode;
  document.body.classList.toggle('dark-mode', appState.darkMode);

  if (appState.stickers.length === 0) {
    addStickerInput(dom.stickersDiv);
  } else {
    appState.stickers.forEach(sticker => addStickerInput(dom.stickersDiv, sticker));
  }

  // --- Event Listeners ---

  // Settings
  dom.vinylCostInput.addEventListener('change', () => { appState.vinylCost = parseFloat(dom.vinylCostInput.value); saveAppState(appState); });
  dom.vatRateInput.addEventListener('change', () => { appState.vatRate = parseFloat(dom.vatRateInput.value); saveAppState(appState); });
  dom.includeVatCheckbox.addEventListener('change', () => { appState.includeVat = dom.includeVatCheckbox.checked; saveAppState(appState); });
  dom.materialSelect.addEventListener('change', () => { appState.material = dom.materialSelect.value; saveAppState(appState); });
  dom.roundedCornersCheckbox.addEventListener('change', () => { appState.roundedCorners = dom.roundedCornersCheckbox.checked; saveAppState(appState); });

  // Dark Mode
  dom.darkModeToggle.addEventListener('change', async () => {
    appState.darkMode = dom.darkModeToggle.checked;
    document.body.classList.toggle('dark-mode', appState.darkMode);
    await saveAppState(appState);
  });

  // Stickers
  dom.addStickerBtn.addEventListener('click', () => addStickerInput(dom.stickersDiv));

  // Calculation
  function calculateAndRender() {
    const stickerInputs = dom.stickersDiv.querySelectorAll('.sticker-input');
    appState.stickers = Array.from(stickerInputs).map(input => {
      const id = input.getAttribute('data-id');
      return {
        width: input.querySelector(`#width-${id}`).value,
        height: input.querySelector(`#height-${id}`).value,
        quantity: input.querySelector(`#quantity-${id}`).value
      };
    });
    saveAppState(appState);

    const quoteData = calculateQuote();
    const quoteText = renderResults(dom.resultsDiv, quoteData);

    // Re-attach copy listener
    const newCopyQuoteBtn = document.getElementById('copy-quote');
    if (newCopyQuoteBtn) {
      newCopyQuoteBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(quoteText).then(() => {
          showToast('Quote copied to clipboard!');
        });
      });
    }

    const newSavePdfBtn = document.getElementById('save-pdf');
    if (newSavePdfBtn) {
      newSavePdfBtn.addEventListener('click', () => {
        generatePdf(quoteData);
      });
    }
  }

  dom.calculateBtn.addEventListener('click', calculateAndRender);

  // --- Calculation Logic ---
  function calculateQuote() {
    const stickerQuotes = [];
    let totalCostExclVat = 0;

    appState.stickers.forEach((sticker, index) => {
      const { price, stickersPerRow } = calculatePrice(sticker.width, sticker.height, appState.vinylCost);
      if (price === 'Invalid dimensions') {
        stickerQuotes.push({
          html: `Sticker ${index + 1}: Invalid dimensions`,
          text: `Sticker ${index + 1} (${sticker.width}x${sticker.height}mm): Invalid dimensions`
        });
      } else {
        const rows = Math.ceil(sticker.quantity / stickersPerRow);
        const totalStickers = rows * stickersPerRow;
        const totalPriceExclVatPerSticker = (price * totalStickers);
        const totalPriceInclVat = (totalPriceExclVatPerSticker * (1 + appState.vatRate / 100));

        stickerQuotes.push({
          html: `${sticker.width}x${sticker.height}mm - R${price} excl VAT per sticker (${stickersPerRow} stickers per row)<br>${rows} rows - ${totalStickers} stickers<br>R${totalPriceExclVatPerSticker.toFixed(2)} Excl VAT` + (appState.includeVat ? `<br><span style="margin-left: 20px;">Incl VAT: R${totalPriceInclVat.toFixed(2)}</span>` : ''),
          text: `${sticker.width}x${sticker.height}mm - R${price} excl VAT per sticker (${stickersPerRow} stickers per row)\n${rows} rows - ${totalStickers} stickers\nR${totalPriceExclVatPerSticker.toFixed(2)} Excl VAT` + (appState.includeVat ? `\nIncl VAT: R${totalPriceInclVat.toFixed(2)}` : '')
        });
        totalCostExclVat += totalPriceExclVatPerSticker;
      }
    });

    return {
      material: appState.material,
      stickerQuotes,
      totalCostExclVat,
      totalCostInclVat: totalCostExclVat * (1 + appState.vatRate / 100),
      includeVat: appState.includeVat,
      minOrderAmount: MIN_ORDER_AMOUNT,
      roundedCorners: appState.roundedCorners
    };
  }

  // --- PDF Generation ---
  function generatePdf(quoteData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Sticker King Quote", 10, 10);
    doc.text(`Material: ${quoteData.material}`, 10, 20);

    let y = 30;
    quoteData.stickerQuotes.forEach(stickerQuote => {
      const lines = doc.splitTextToSize(stickerQuote.text, 180);
      doc.text(lines, 10, y);
      y += lines.length * 10;
    });

    if (quoteData.totalCostExclVat > 0) {
      doc.text(`Total: R${quoteData.totalCostExclVat.toFixed(2)} Exclusive of VAT`, 10, y);
      y += 10;

      if (quoteData.includeVat) {
        doc.text(`Total Incl VAT: R${quoteData.totalCostInclVat.toFixed(2)} the complete order total`, 10, y);
        y += 10;
      }

      if (quoteData.totalCostExclVat < quoteData.minOrderAmount) {
        doc.text('YOUR ORDER IS UNDER R100.00 EXCL VAT. WE HAVE A MINIMUM ORDER AMOUNT OF R100.00 EXCL VAT', 10, y);
        y += 10;
      }

      if (quoteData.roundedCorners) {
        doc.text("Cutline with rounded Corners", 10, y);
        y += 10;
      }
    }

    doc.save("quote.pdf");
  }

  // --- Debounce Utility ---
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const debouncedCalculateAndRender = debounce(calculateAndRender, 300);

  // --- Auto-calculation Listeners ---
  const inputsToTrack = [
    dom.vinylCostInput,
    dom.vatRateInput,
    dom.includeVatCheckbox,
    dom.materialSelect,
    dom.roundedCornersCheckbox
  ];

  inputsToTrack.forEach(input => {
    input.addEventListener('change', debouncedCalculateAndRender);
  });

  dom.stickersDiv.addEventListener('input', (event) => {
    if (event.target.tagName === 'INPUT') {
      debouncedCalculateAndRender();
    }
  });

  // --- Collapsible sections ---
  document.querySelectorAll('.section-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const icon = button.querySelector('.toggle-icon');
      content.classList.toggle('active');
      icon.classList.toggle('active');
      button.setAttribute('aria-expanded', content.classList.contains('active'));
    });
  });
});
