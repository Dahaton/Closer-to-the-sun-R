import { BaseScene } from './baseScene.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { t } from '../localization.js';

export class CutsceneScene extends BaseScene {
  constructor(renderer, manager, isEnding = false) {
    super(renderer, manager);
    this.isEnding = isEnding;
    this.counter = 0;

    this.overlayElement = document.getElementById("cutscene-overlay");
    this.textElement = document.getElementById("cutscene-text");
  }

  getIntroSlides() {
    return [
      { image: "ui/Cutscene2.png", textKey: "introSlide1" },
      { image: "ui/Cutscene_Start1.png", textKey: "introSlide2" },
      { image: "ui/Cutscene_Start2.png", textKey: "introSlide3" },
      { image: "ui/Cutscene_Start3.png", textKey: "introSlide4" },
      { image: "ui/Cutscene_Start4.png", textKey: "introSlide5" },
      { image: "ui/Cutscene_Start5.png", textKey: "introSlide6" }
    ];
  }

  async init() {
    this.counter = 0;

    audio.playMusicOnChannel("Damiano Baldoni - A Long Story.mp3", 19, true, 50);

    if (this.overlayElement) {
      this.overlayElement.style.display = "flex";
    }

    this.updateSlide();
  }

  updateSlide() {
    if (this.isEnding) {
      if (this.overlayElement) {
        this.overlayElement.style.backgroundImage = "url('assets/ui/Cutscene_Start6.png')";
      }
      if (this.textElement) {
        this.textElement.style.fontSize = "24px";
        this.textElement.style.lineHeight = "1.4";
        this.textElement.innerHTML = t("endingSlide");
      }
    } else {
      const slides = this.getIntroSlides();
      const slide = slides[this.counter];
      if (slide) {
        if (this.overlayElement) {
          this.overlayElement.style.backgroundImage = `url('assets/${slide.image}')`;
        }
        if (this.textElement) {
          this.textElement.style.fontSize = "24px";
          this.textElement.style.lineHeight = "1.4";
          this.textElement.innerHTML = t(slide.textKey);
        }
      }
    }
  }

  update(delta) {
    super.update(delta);

    if (input.isKeyJustPressed("e")) {
      if (this.isEnding) {
        this.manager.switchScene("MainMenu");
      } else {
        this.counter++;
        const slides = this.getIntroSlides();
        if (this.counter >= slides.length) {
          this.manager.switchScene("City");
        } else {
          this.updateSlide();
        }
      }
    }
  }

  destroy() {
    super.destroy();
    if (this.overlayElement) {
      this.overlayElement.style.display = "none";
      this.overlayElement.style.backgroundImage = "none";
    }
  }
}