import { HUDComponent } from './hudComponent.js';
import { DialogueComponent } from './dialogueComponent.js';
import { PanelsComponent } from './panelsComponent.js';
import { ModalsComponent } from './modalsComponent.js';

class UIManager {
  constructor() {
    this.initPulseStyle();

    this.hud = new HUDComponent();
    this.dialogue = new DialogueComponent();
    this.panels = new PanelsComponent(this.hud);
    this.modals = new ModalsComponent(this.hud);
  }

  initPulseStyle() {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'MainFont';
        src: url('./assets/MainFont.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }

      @keyframes alertPulse {
        0% { transform: translate(-50%, -50%) scale(0.92); }
        100% { transform: translate(-50%, -50%) scale(1.2); }
      }
      @keyframes fallingSway {
        0% { transform: rotate(-3.5deg) translateY(-2px); }
        50% { transform: rotate(3.5deg) translateY(2px); }
        100% { transform: rotate(-3.5deg) translateY(-2px); }
      }
      @keyframes bounceArrow {
        0%, 100% { transform: translateY(0); opacity: 0.6; }
        50% { transform: translateY(4px); opacity: 1; }
      }
      @keyframes summaryPopIn {
        0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes summaryItemSlide {
        0% { transform: translateY(12px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes textTremble {
        0% { transform: translate(0, 0); }
        25% { transform: translate(-0.4px, 0.4px); }
        50% { transform: translate(0.4px, -0.4px); }
        75% { transform: translate(-0.4px, -0.4px); }
        100% { transform: translate(0, 0); }
      }

      body, #game-viewport, html {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23120a0e' d='M0 0l22 10-9 3-3 9z'/%3E%3Cpath fill='%23dfc888' d='M2 2l17 8-7 2.5-2.5 7z'/%3E%3C/svg%3E") 0 0, auto !important;
      }

      button, .menu-btn, input, select, a, .ui-element, .lang-select-btn {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23120a0e' d='M0 0l22 10-9 3-3 9z'/%3E%3Cpath fill='%23ffdd90' d='M2 2l17 8-7 2.5-2.5 7z'/%3E%3C/svg%3E") 0 0, pointer !important;
      }

      input[type="checkbox"] {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 20px !important;
        height: 20px !important;
        background: rgba(28, 20, 32, 0.95) !important;
        border: 2px solid #b89855 !important;
        border-radius: 3px !important;
        cursor: pointer !important;
        position: relative !important;
        outline: none !important;
        transition: all 0.15s ease !important;
      }

      input[type="checkbox"]:hover {
        border-color: #ffdd90 !important;
        box-shadow: 0 0 5px rgba(184, 152, 85, 0.6) !important;
      }

      input[type="checkbox"]:checked {
        background: #b89855 !important;
        border-color: #ffdd90 !important;
      }

      input[type="checkbox"]:checked::after {
        content: "✓" !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        color: #120a0e !important;
        font-size: 14px !important;
        font-weight: bold !important;
      }

      body, button, input, select, div, span, p, h1, h2, h3, h4,
      #game-viewport *, .ui-element, #ui-item-tooltip, 
      #loading-screen-overlay *, #tower-progress-bar-container *, 
      #tower-alerts-container *, #ui-glide-timer *, #ui-charge-bar *, 
      #prompt-text, #distance-counter, #workshop-panel *, #shop-panel *,
      #modal-pause *, #modal-tutorial *, #modal-summary *, #modal-retry *, #dialogue-box * {
        font-family: 'MainFont', monospace, sans-serif !important;
      }

      #touch-controls-overlay {
        z-index: 29000 !important;
      }

      #dialogue-box {
        position: absolute !important;
        top: auto !important;
        bottom: 14px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 600px !important;
        height: 125px !important;
        min-height: 125px !important;
        max-height: 125px !important;
        background: rgba(18, 14, 28, 0.96) !important;
        border: 3px double #b89855 !important;
        outline: 2px solid #523a1a !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
        box-shadow: 0 0 25px rgba(0, 0, 0, 0.9), inset 0 0 12px rgba(184, 152, 85, 0.15) !important;
        padding: 12px 16px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        z-index: 25000 !important;
        display: none;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 16px !important;
        overflow: visible !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      #modal-overlay {
        z-index: 30000 !important;
      }

      #modal-pause, #modal-tutorial, #modal-summary, #modal-retry {
        z-index: 40000 !important;
      }

      #prompt-text {
        position: absolute !important;
        bottom: 24px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        max-width: 90% !important;
        padding: 6px 14px !important;
        text-align: center !important;
        font-size: 18px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        box-sizing: border-box !important;
        background: rgba(18, 14, 28, 0.9) !important;
        border: 2px solid #b89855 !important;
        border-radius: 4px !important;
        color: #dfc888 !important;
        box-shadow: 2px 2px 0px rgba(0,0,0,0.8) !important;
      }

      #dialogue-portrait {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        width: 80px !important;
        height: 80px !important;
        min-width: 80px !important;
        min-height: 80px !important;
        max-width: 80px !important;
        max-height: 80px !important;
        flex-shrink: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 2px solid #b89855 !important;
        border-radius: 3px !important;
        box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8) !important;
        background-color: rgba(28, 20, 32, 0.9) !important;
        background-size: cover !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        box-sizing: border-box !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      #dialogue-text {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        color: #d8c292 !important;
        font-family: 'MainFont', monospace, sans-serif !important;
        font-size: 18px !important;
        font-weight: bold !important;
        line-height: 1.35 !important;
        text-shadow: 1px 1px 2px #000, -1px -1px 0px #000, 1px -1px 0px #000 !important;
        flex: 1 1 0% !important;
        min-width: 0 !important;
        width: 100% !important;
        height: 100% !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        white-space: pre-wrap !important;
        box-sizing: border-box !important;
        overflow-y: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
      }

      #dialogue-arrow-indicator {
        position: absolute !important;
        bottom: 8px !important;
        right: 14px !important;
        font-size: 15px !important;
        color: #ffd54f !important;
        text-shadow: 1px 1px 2px #000 !important;
        animation: bounceArrow 0.8s infinite ease-in-out !important;
        pointer-events: none !important;
        display: none;
      }

      #distance-counter {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        font-size: 13px !important;
        color: #ffd54f !important;
        background: rgba(18, 14, 28, 0.85) !important;
        padding: 4px 8px !important;
        border: 1px solid #b89855 !important;
        border-radius: 3px !important;
        text-shadow: 1px 1px 0px #000 !important;
        z-index: 20000 !important;
      }

      .greek-meander-bar {
        width: 100%;
        height: 14px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='14' viewBox='0 0 24 14'%3E%3Cpath stroke='%23b89855' stroke-width='1.5' fill='none' stroke-linecap='square' stroke-linejoin='miter' d='M0,2 H24 M20,2 V11 H3.5 V5 H16.5 V8 H8'/%3E%3C/svg%3E");
        background-repeat: repeat-x;
        background-size: 24px 14px;
        background-position: left center;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
      }

      .greek-modal-box {
        border: 3px double #b89855 !important;
        outline: 2px solid #523a1a !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 25px rgba(0, 0, 0, 0.9), inset 0 0 12px rgba(184, 152, 85, 0.15) !important;
      }

      .menu-btn {
        width: 100%;
        padding: 12px 20px;
        background: rgba(28, 20, 32, 0.92);
        border: 2px solid #b89855;
        border-radius: 3px;
        color: #dfc888;
        font-family: 'MainFont', monospace, sans-serif !important;
        font-size: 20px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
        transition: all 0.15s ease;
        text-shadow: 1px 1px 0px #000;
      }

      .menu-btn:hover {
        background: #b89855;
        color: #120a0e;
        border-color: #ffdd90;
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.9);
      }

      .menu-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.9);
      }
    `;
    document.head.appendChild(style);
  }

  updateHUD(playerZ = 0, delta = 0.016) { this.hud.updateHUD(playerZ, delta); }
  showPrompt(text) { this.hud.showPrompt(text); }
  hidePrompt() { this.hud.hidePrompt(); }
  showWindEffect(durationSec) { this.hud.showWindEffect(durationSec); }
  updateReturnHint(hasTakenOff) { this.hud.updateReturnHint(hasTakenOff); }
  updateGlideTimer(playerObj, camera, remainingTime, maxTime) { this.hud.updateGlideTimer(playerObj, camera, remainingTime, maxTime); }
  hideGlideTimer() { this.hud.hideGlideTimer(); }
  updateChargeBar(playerObj, camera, progress, feathersSpent) { this.hud.updateChargeBar(playerObj, camera, progress, feathersSpent); }
  hideChargeBar() { this.hud.hideChargeBar(); }
  updateTowerProgressBar(playerZ) { this.hud.updateTowerProgressBar(playerZ); }
  updateTowerAlerts(playerObj, camera, obstacles, collectibles, flags) { this.hud.updateTowerAlerts(playerObj, camera, obstacles, collectibles, flags); }
  hideAlerts() { this.hud.hideAlerts(); }
  showTooltip(e, htmlContent) { this.hud.showTooltip(e, htmlContent); }
  updateTooltipPosition(e) { this.hud.updateTooltipPosition(e); }
  hideTooltip() { this.hud.hideTooltip(); }
  showCenterNotification(text, durationMs) { this.hud.showCenterNotification(text, durationMs); }

  showDialogue(text, portraitKey, speakerName) { this.dialogue.showDialogue(text, portraitKey, speakerName); }
  hideDialogue() { this.dialogue.hideDialogue(); }
  isTypewriterActive() { return this.dialogue.isTypewriterActive(); }
  skipTypewriter() { this.dialogue.skipTypewriter(); }

  openWorkshop() { this.panels.openWorkshop(); }
  closeWorkshop() { this.panels.closeWorkshop(); }
  updateWorkshop() { this.panels.updateWorkshop(); }
  openShop() { this.panels.openShop(); }
  closeShop() { this.panels.closeShop(); }
  updateShop() { this.panels.updateShop(); }

  togglePauseMenu(appManager) { this.modals.togglePauseMenu(appManager); }
  showPauseMenu() { this.modals.showPauseMenu(); }
  hidePauseMenu() { this.modals.hidePauseMenu(); }
  showTutorialModal() { this.modals.showTutorialModal(); }
  hideTutorialModal() { this.modals.hideTutorialModal(); }
  showRunSummary(summaryData) { this.modals.showRunSummary(summaryData); }
  hideRunSummaryModal() { this.modals.hideRunSummaryModal(); }
  showRetryModal(onRetry, onExitToCity, screenPos) { this.modals.showRetryModal(onRetry, onExitToCity, screenPos); }
  hideRetryModal() { this.modals.hideRetryModal(); }
  showLoadingScreen(customText, isFalling) { this.modals.showLoadingScreen(customText, isFalling); }
  hideLoadingScreen() { this.modals.hideLoadingScreen(); }
  fadeInBlackScreen(durationMs, callback) { this.modals.fadeInBlackScreen(durationMs, callback); }
  fadeOutBlackScreen(durationMs) { this.modals.fadeOutBlackScreen(durationMs); }
}

export const ui = new UIManager();
window.ui = ui;