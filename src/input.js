import { state } from './state.js';

class InputManager {
  constructor() {
    this.pressed = {};
    this.justPressed = {};
    this.justReleased = {};
    
    this.mouse = {
      down: false,
      justDown: false,
      x: 0,
      y: 0
    };

    this.keyToCodeMap = {
      'a': 'KeyA',
      'd': 'KeyD',
      'w': 'KeyW',
      's': 'KeyS',
      'e': 'KeyE',
      'r': 'KeyR',
      't': 'KeyT',
      'space': 'Space',
      'escape': 'Escape',
      'enter': 'Enter',
      '7': 'Digit7',
      '8': 'Digit8'
    };

    window.addEventListener('keydown', (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
        return;
      }
      
      const code = e.code;
      if (!this.pressed[code]) {
        this.justPressed[code] = true;
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            delete this.justPressed[code];
          });
        });
      }
      this.pressed[code] = true;
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      this.pressed[code] = false;
      this.justReleased[code] = true;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          delete this.justReleased[code];
        });
      });
    });

    window.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.justDown = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.mouse.justDown = false;
        });
      });
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
  }


  setVirtualKey(keyName, isDown) {
    const code = this.keyToCodeMap[keyName.toLowerCase()] || keyName;
    if (isDown) {
      if (!this.pressed[code]) {
        this.justPressed[code] = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            delete this.justPressed[code];
          });
        });
      }
      this.pressed[code] = true;
    } else {
      if (this.pressed[code]) {
        this.justReleased[code] = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            delete this.justReleased[code];
          });
        });
      }
      this.pressed[code] = false;
    }
  }

  isKeyDown(keyName) {
    const code = this.keyToCodeMap[keyName.toLowerCase()] || keyName;
    return !!this.pressed[code];
  }

  isKeyJustPressed(keyName) {
    const code = this.keyToCodeMap[keyName.toLowerCase()] || keyName;
    const value = !!this.justPressed[code];
    if (value) {
      delete this.justPressed[code];
    }
    return value;
  }

  isKeyJustReleased(keyName) {
    const code = this.keyToCodeMap[keyName.toLowerCase()] || keyName;
    const value = !!this.justReleased[code];
    if (value) {
      delete this.justReleased[code];
    }
    return value;
  }


  endFrame() {
    this.mouse.justDown = false;
  }
}

export const input = new InputManager();
export default input;