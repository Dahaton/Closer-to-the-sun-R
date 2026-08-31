

import { state } from './state.js';

export class DialogueComponent {
  constructor() {
    this.dialogueBox = document.getElementById("dialogue-box");
    this.dialoguePortrait = document.getElementById("dialogue-portrait");
    this.dialogueText = document.getElementById("dialogue-text");

    this.typewriterInterval = null;
    this.fullDialogueText = "";
    this.isTyping = false;

    this.bindEvents();
  }

  ensureDialogueElements() {
    let box = document.getElementById("dialogue-box");
    const viewport = document.getElementById("game-viewport") || document.body;

    if (!box) {
      box = document.createElement("div");
      box.id = "dialogue-box";
      viewport.appendChild(box);
    }
    this.dialogueBox = box;

    let portrait = document.getElementById("dialogue-portrait");
    let textElem = document.getElementById("dialogue-text");

    if (!portrait || !textElem) {
      box.innerHTML = `
        <div id="dialogue-portrait"></div>
        <div id="dialogue-text"></div>
        <div id="dialogue-arrow-indicator">▼</div>
      `;
      portrait = document.getElementById("dialogue-portrait");
      textElem = document.getElementById("dialogue-text");
    }

    this.dialoguePortrait = portrait;
    this.dialogueText = textElem;
  }

  bindEvents() {
    if (this.dialogueBox) {
      this.dialogueBox.addEventListener("click", () => {
        if (state.inDialogue && state.currentScene === "City") {
          const activeScene = window.gameApp?.currentScene;
          if (activeScene && typeof activeScene.advanceDialogue === "function") {
            activeScene.advanceDialogue();
          }
        }
      });
    }
  }

  showDialogue(text, portraitKey, speakerName = "") {
    this.ensureDialogueElements();

    if (!this.dialogueBox) return;

    state.inDialogue = true;
    this.dialogueBox.style.display = "flex";

    const formattedText = speakerName ? `${speakerName}:\n${text}` : text;
    this.fullDialogueText = formattedText;

    let arrow = document.getElementById("dialogue-arrow-indicator");
    if (!arrow) {
      arrow = document.createElement("div");
      arrow.id = "dialogue-arrow-indicator";
      arrow.innerText = "▼";
      this.dialogueBox.appendChild(arrow);
    }
    arrow.style.display = "none";

    if (this.dialoguePortrait) {
      if (portraitKey === "NPC" || !portraitKey || portraitKey === "Bum") {
        this.dialoguePortrait.style.display = "none";
      } else {
        this.dialoguePortrait.style.display = "block";
        let portraitUrl = "";
        if (portraitKey === "Salesman") {
          portraitUrl = "assets/npcs/salesman_port.png";
        } else if (portraitKey === "Dummy") {
          portraitUrl = "assets/npcs/dummy_port.png";
        } else if (portraitKey === "SmileMainCharacter") {
          portraitUrl = "assets/npcs/portrait2.png";
        } else {
          portraitUrl = "assets/npcs/portrait1.png";
        }

        this.dialoguePortrait.style.backgroundImage = `url('${portraitUrl}')`;
      }
    }

    this.startTypewriter(formattedText);

    if (window.ui) {
      window.ui.updateHUD();
    }
  }

  startTypewriter(text) {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.isTyping = true;
    let charIndex = 0;
    if (this.dialogueText) this.dialogueText.innerText = "";

    const arrow = document.getElementById("dialogue-arrow-indicator");
    if (arrow) arrow.style.display = "none";

    this.typewriterInterval = setInterval(() => {
      charIndex++;
      if (this.dialogueText) {
        this.dialogueText.innerText = text.substring(0, charIndex);
      }

      if (charIndex >= text.length) {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
        this.isTyping = false;
        if (arrow) arrow.style.display = "block";
      }
    }, 25);
  }

  isTypewriterActive() {
    return this.isTyping;
  }

  skipTypewriter() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.dialogueText) {
      this.dialogueText.innerText = this.fullDialogueText;
    }
    this.isTyping = false;
    const arrow = document.getElementById("dialogue-arrow-indicator");
    if (arrow) arrow.style.display = "block";
  }

  hideDialogue() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTyping = false;
    state.inDialogue = false;

    if (this.dialogueBox) {
      this.dialogueBox.style.display = "none";
    }

    if (window.ui) {
      window.ui.updateHUD();
    }
  }
}
