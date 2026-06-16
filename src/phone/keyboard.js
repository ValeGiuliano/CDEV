let keyboardEl = null;
let activeInput = null;
let onEnter = null;

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export function initKeyboard() {
  keyboardEl = document.getElementById('phoneKeyboard');
  const closeBtn = document.getElementById('closePhoneKeyboardBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideKeyboard();
    });
  }
}

export function showKeyboard(inputField, onEnterCallback) {
  if (!keyboardEl) return;
  activeInput = inputField;
  onEnter = onEnterCallback;

  // Scramble letters
  const scrambled = [...letters].sort(() => Math.random() - 0.5);

  const keysContainer = document.getElementById('phoneKeyboardKeys');
  if (!keysContainer) return;

  keysContainer.innerHTML = '';

  // Render letters
  scrambled.forEach((letter) => {
    const key = document.createElement('button');
    key.className = 'phone-key';
    key.textContent = letter;
    key.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeInput) {
        activeInput.value += letter;
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    keysContainer.appendChild(key);
  });

  // Space key
  const spaceKey = document.createElement('button');
  spaceKey.className = 'phone-key space-key';
  spaceKey.textContent = ' ';
  spaceKey.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeInput) {
      activeInput.value += ' ';
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  keysContainer.appendChild(spaceKey);

  // Backspace key
  const backspaceKey = document.createElement('button');
  backspaceKey.className = 'phone-key wide-key';
  backspaceKey.textContent = 'Borrar';
  backspaceKey.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeInput) {
      activeInput.value = activeInput.value.slice(0, -1);
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  keysContainer.appendChild(backspaceKey);

  // Enter/Search key
  const enterKey = document.createElement('button');
  enterKey.className = 'phone-key enter-key';
  enterKey.textContent = 'Buscar';
  enterKey.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onEnter) onEnter(activeInput ? activeInput.value : '');
    hideKeyboard();
  });
  keysContainer.appendChild(enterKey);

  keyboardEl.classList.remove('is-hidden');
}

export function hideKeyboard() {
  if (keyboardEl) {
    keyboardEl.classList.add('is-hidden');
  }
  activeInput = null;
  onEnter = null;
}
