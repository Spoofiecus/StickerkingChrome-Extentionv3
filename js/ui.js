export function getDOMElements() {
  return {
    addStickerBtn: document.getElementById('add-sticker'),
    calculateBtn: document.getElementById('calculate'),
    stickersDiv: document.getElementById('stickers'),
    resultsDiv: document.getElementById('results'),
    vinylCostInput: document.getElementById('vinyl-cost'),
    vatRateInput: document.getElementById('vat-rate'),
    includeVatCheckbox: document.getElementById('include-vat'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    materialSelect: document.getElementById('material-select'),
    roundedCornersCheckbox: document.getElementById('rounded-corners'),
    toast: document.getElementById('toast'),
    copyQuoteBtn: null, // Will be created dynamically
    savePdfBtn: null, // Will be created dynamically
  };
}

let stickerCount = 0;

export function addStickerInput(stickersDiv, sticker = { width: '', height: '', quantity: 1 }) {
  stickerCount++;
  const stickerInput = document.createElement('div');
  stickerInput.className = 'sticker-input';
  stickerInput.setAttribute('data-id', stickerCount);

  const createInputGroup = (id, labelText, value, type = 'number') => {
    const group = document.createElement('div');
    group.className = 'input-group';

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = value;
    input.min = '1';
    input.setAttribute('aria-label', `Sticker ${labelText.toLowerCase()}`);

    group.appendChild(label);
    group.appendChild(input);
    return { group, input };
  };

  const { group: widthGroup, input: widthInput } = createInputGroup(`width-${stickerCount}`, 'Width (mm)', sticker.width);
  widthInput.title = 'Enter the width of the sticker in millimeters';

  const { group: heightGroup, input: heightInput } = createInputGroup(`height-${stickerCount}`, 'Height (mm)', sticker.height);
  heightInput.title = 'Enter the height of the sticker in millimeters';

  const { group: quantityGroup, input: quantityInput } = createInputGroup(`quantity-${stickerCount}`, 'Quantity', sticker.quantity);
  quantityInput.title = 'Enter the number of stickers needed';

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-button';
  removeButton.setAttribute('data-id', stickerCount);
  removeButton.setAttribute('aria-label', 'Remove sticker');

  stickerInput.appendChild(widthGroup);
  stickerInput.appendChild(heightGroup);
  stickerInput.appendChild(quantityGroup);
  stickerInput.appendChild(removeButton);

  stickersDiv.appendChild(stickerInput);
  stickerInput.style.animation = 'fadeInUp 0.3s ease forwards';

  removeButton.addEventListener('click', () => {
    stickerInput.style.animation = 'fadeOutDown 0.3s ease forwards';
    setTimeout(() => stickerInput.remove(), 300);
  });

  const validate = (input) => {
    if (input.value && (isNaN(input.value) || parseFloat(input.value) <= 0)) {
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
  };

  widthInput.addEventListener('input', () => validate(widthInput));
  heightInput.addEventListener('input', () => validate(heightInput));
}

export function renderResults(resultsDiv, quoteData) {
  // Clear previous results safely
  while (resultsDiv.firstChild) {
    resultsDiv.removeChild(resultsDiv.firstChild);
  }

  if (quoteData.material === 'unspecified') {
    const error = document.createElement('p');
    error.textContent = 'Quote not generated. Reason: no Material specified.';
    resultsDiv.appendChild(error);
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const copyButton = document.createElement('button');
  copyButton.id = 'copy-quote';
  copyButton.className = 'copy-quote-button';
  const copyIcon = document.createElement('i');
  copyIcon.className = 'fas fa-copy';
  copyButton.appendChild(copyIcon);
  buttonContainer.appendChild(copyButton);

  const savePdfButton = document.createElement('button');
  savePdfButton.id = 'save-pdf';
  savePdfButton.className = 'save-pdf-button';
  const pdfIcon = document.createElement('i');
  pdfIcon.className = 'fas fa-file-pdf';
  savePdfButton.appendChild(pdfIcon);
  buttonContainer.appendChild(savePdfButton);

  resultsDiv.appendChild(buttonContainer);

  let fullQuote = `Dear Customer. Thank you for reaching out to us.\nBelow is your Quote based on your request:\n\nMaterial: ${quoteData.material}\n\n`;

  quoteData.stickerQuotes.forEach(stickerQuote => {
    const p = document.createElement('p');
    // Using innerHTML here is a pragmatic choice for now to keep the line breaks.
    // A more advanced solution would be to create text nodes and br elements.
    p.innerHTML = stickerQuote.html;
    resultsDiv.appendChild(p);
    fullQuote += `${stickerQuote.text}\n`;
  });

  if (quoteData.totalCostExclVat > 0) {
    const totalExclVatEl = document.createElement('p');
    const strongExcl = document.createElement('strong');
    strongExcl.textContent = `Total: R${quoteData.totalCostExclVat.toFixed(2)} Exclusive of VAT`;
    totalExclVatEl.appendChild(strongExcl);
    resultsDiv.appendChild(totalExclVatEl);
    fullQuote += `\nTotal: R${quoteData.totalCostExclVat.toFixed(2)} Exclusive of VAT\n`;

    if (quoteData.includeVat) {
      const totalInclVatEl = document.createElement('p');
      const strongIncl = document.createElement('strong');
      strongIncl.textContent = `Total Incl VAT: R${quoteData.totalCostInclVat.toFixed(2)} the complete order total`;
      totalInclVatEl.appendChild(strongIncl);
      resultsDiv.appendChild(totalInclVatEl);
      fullQuote += `Total Incl VAT: R${quoteData.totalCostInclVat.toFixed(2)} the complete order total\n`;
    }

    if (quoteData.totalCostExclVat < quoteData.minOrderAmount) {
      const minOrderEl = document.createElement('p');
      minOrderEl.style.color = '#E74C3C';
      minOrderEl.style.textTransform = 'uppercase';
      minOrderEl.textContent = 'YOUR ORDER IS UNDER R100.00 EXCL VAT. WE HAVE A MINIMUM ORDER AMOUNT OF R100.00 EXCL VAT';
      resultsDiv.appendChild(minOrderEl);
      fullQuote += `\nYOUR ORDER IS UNDER R100.00 EXCL VAT. WE HAVE A MINIMUM ORDER AMOUNT OF R100.00 EXCL VAT\n`;
    }

    if (quoteData.roundedCorners) {
      fullQuote += `\nCutline with rounded Corners\n`;
    }

    fullQuote += `\nPlease let us know if this quote is accepted so we can proceed with printing.\n`;
    resultsDiv.classList.add('show');
  }

  return fullQuote;
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
