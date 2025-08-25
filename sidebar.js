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
  async function getImageBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function generatePdf(quoteData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;

    // --- Helper function to add footer ---
    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Thank you for your business!", 105, pageHeight - 15, { align: 'center' });
      doc.text("Sticker King | www.stickerking.co.za | sales@stickerking.co.za", 105, pageHeight - 10, { align: 'center' });
    };

    // --- Load Logo ---
    const logoUrl = chrome.runtime.getURL('Logo.png');
    const logoBase64 = await getImageBase64(logoUrl);
    doc.addImage(logoBase64, 'PNG', 14, 12, 50, 15);

    // --- Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("QUOTE", 196, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Sticker King Pty (Ltd)", 196, 28, { align: 'right' });
    doc.text("123 Vinyl Lane, Print City", 196, 32, { align: 'right' });
    doc.text("sales@stickerking.co.za", 196, 36, { align: 'right' });

    // --- Quote Details ---
    let y = 55;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Quote Details", 14, y);
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, 196, y); // horizontal line
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Material: ${quoteData.material}`, 14, y);
    y += 6;
    if (quoteData.roundedCorners) {
        doc.text("Options: Cutline with rounded Corners", 14, y);
        y += 6;
    }
    y += 10;

    // --- Line Items Table Header ---
    doc.setFont('helvetica', 'bold');
    doc.text("Description", 14, y);
    doc.text("Unit Price", 120, y, { align: 'right' });
    doc.text("Quantity", 155, y, { align: 'right' });
    doc.text("Total", 196, y, { align: 'right' });
    y += 4;
    doc.line(14, y, 196, y); // horizontal line
    y += 8;

    // --- Line Items ---
    doc.setFont('helvetica', 'normal');
    quoteData.stickerQuotes.forEach(sticker => {
      if (y > pageHeight - 40) {
        addFooter();
        doc.addPage();
        y = 20;
      }
      const description = `${sticker.html.split('<br>')[0]}`;
      const lines = doc.splitTextToSize(description, 90);
      doc.text(lines, 14, y);

      const price = parseFloat(sticker.html.match(/R([\d.]+)/)[1]);
      const quantity = parseInt(sticker.html.match(/(\d+) stickers<br>/)[1]);
      const total = price * quantity;

      doc.text(`R${price.toFixed(2)}`, 120, y, { align: 'right' });
      doc.text(`${quantity}`, 155, y, { align: 'right' });
      doc.text(`R${total.toFixed(2)}`, 196, y, { align: 'right' });
      y += (lines.length * 5) + 8;
    });

    // --- Totals ---
    if (y > pageHeight - 50) {
        addFooter();
        doc.addPage();
        y = 30;
    }
    y += 5;
    doc.line(120, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text("Subtotal", 155, y, { align: 'right' });
    doc.text(`R${quoteData.totalCostExclVat.toFixed(2)}`, 196, y, { align: 'right' });
    y += 7;

    if (quoteData.includeVat) {
        doc.setFont('helvetica', 'normal');
        doc.text(`VAT (${DEFAULT_VAT_RATE}%)`, 155, y, { align: 'right' });
        const vatAmount = quoteData.totalCostInclVat - quoteData.totalCostExclVat;
        doc.text(`R${vatAmount.toFixed(2)}`, 196, y, { align: 'right' });
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.text("Total", 155, y, { align: 'right' });
        doc.text(`R${quoteData.totalCostInclVat.toFixed(2)}`, 196, y, { align: 'right' });
        y+=7;
    }


    // --- Minimum Order Note ---
    if (quoteData.totalCostExclVat < quoteData.minOrderAmount) {
      doc.setFontSize(9);
      doc.setTextColor(220, 53, 69); // Bootstrap's danger color
      doc.text(`Minimum order amount of R${quoteData.minOrderAmount.toFixed(2)} excl. VAT applies.`, 14, y + 10);
    }

    // --- Footer ---
    addFooter();

    doc.save("StickerKing-Quote.pdf");
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
