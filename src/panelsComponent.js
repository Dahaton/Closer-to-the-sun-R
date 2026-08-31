
import { state, RECIPES, canCraftRecipe, craftAndEquip, buyItem, sellItem } from './state.js';
import { audio } from './audio.js';
import { t } from './localization.js';

export const ITEM_DATA = {
  fabric1: { key: "item_fabric1", icon: "assets/items/fabric1.png" },
  fabric2: { key: "item_fabric2", icon: "assets/items/fabric2.png" },
  fabric3: { key: "item_fabric3", icon: "assets/items/fabric3.png" },
  steel1:  { key: "item_steel1", icon: "assets/items/steel1.png" },
  steel2:  { key: "item_steel2", icon: "assets/items/steel2.png" },
  steel3:  { key: "item_steel3", icon: "assets/items/steel3.png" },
  wood1:   { key: "item_wood1", icon: "assets/items/wood1.png" },
  wood2:   { key: "item_wood2", icon: "assets/items/wood2.png" },
  wood3:   { key: "item_wood3", icon: "assets/items/wood3.png" },
  wax:     { key: "item_wax", icon: "assets/items/wax.png" },
  coin:    { key: "item_coin", icon: "assets/items/coin.png" }
};

export const FULL_WING_IMAGES = {
  SteelWings: "assets/wings/steel_wings1.png",
  DurableSteelWings: "assets/wings/durable_steel_wings1.png",
  SuperSteelWings: "assets/wings/super_steel_wings1.png",
  SuperDurableSteelWings: "assets/wings/super_durable_steel_wings1.png",
  EnchantedWings: "assets/wings/fast_tier2_wings1.png",
  DurableEnchantedWings: "assets/wings/heavy_tier2_wings1.png",
  SuperEnchantedWings: "assets/wings/fast_tier2.5_wings1.png",
  SuperDurableEnchantedWings: "assets/wings/heavy_tier2.5_wings1.png",
  MythrilWings: "assets/wings/fast_tier3_wings1.png",
  DurableMythrilWings: "assets/wings/heavy_tier3_wings1.png",
  WaxWings: "assets/wings/wax_wings1.png"
};

const WORKSHOP_INV_POSITIONS = {
  fabric1: { x: 8, y: 276 },
  steel1:  { x: 50, y: 276 },
  wood1:   { x: 90, y: 276 },
  fabric2: { x: 8, y: 316 },
  steel2:  { x: 50, y: 316 },
  wood2:   { x: 90, y: 316 },
  fabric3: { x: 8, y: 356 },
  steel3:  { x: 50, y: 356 },
  wood3:   { x: 90, y: 356 },
  wax:     { x: 50, y: 396 }
};

const SHOP_COUNTER_POSITIONS = {
  fabric1: { x: 111, y: 280 },
  steel1:  { x: 187, y: 282 },
  wood1:   { x: 264, y: 283 },
  fabric2: { x: 338, y: 281 },
  steel2:  { x: 415, y: 281 },
  wood2:   { x: 490, y: 281 },
  fabric3: { x: 111, y: 340 },
  steel3:  { x: 187, y: 340 },
  wood3:   { x: 264, y: 340 }
};

const SHOP_INV_POSITIONS = {
  fabric1: { x: 524, y: 54 },
  steel1:  { x: 566, y: 54 },
  wood1:   { x: 608, y: 54 },
  fabric2: { x: 524, y: 92 },
  steel2:  { x: 566, y: 92 },
  wood2:   { x: 608, y: 92 },
  fabric3: { x: 524, y: 132 },
  steel3:  { x: 566, y: 132 },
  wood3:   { x: 608, y: 132 },
  wax:     { x: 566, y: 169 }
};

function getShopAvailableItems(tier) {
  if (tier >= 3) {
    return ["fabric3", "steel3", "wood3", "fabric2", "steel2", "wood2"];
  } else if (tier >= 2) {
    return ["fabric1", "steel1", "wood1", "fabric2", "steel2", "wood2"];
  } else {
    return ["fabric1", "steel1", "wood1"];
  }
}

function getShopItemCounterPosition(itemKey, currentTier) {
  if (currentTier >= 3) {
    const tier3Positions = {
      fabric3: { x: 111, y: 280 },
      steel3:  { x: 187, y: 282 },
      wood3:   { x: 264, y: 283 },
      fabric2: { x: 338, y: 281 },
      steel2:  { x: 415, y: 281 },
      wood2:   { x: 490, y: 281 }
    };
    if (tier3Positions[itemKey]) return tier3Positions[itemKey];
  }
  return SHOP_COUNTER_POSITIONS[itemKey] || { x: 111, y: 280 };
}

export class PanelsComponent {
  constructor(hudComponent) {
    this.hud = hudComponent;

    this.modalOverlay = document.getElementById("modal-overlay");
    this.workshopPanel = document.getElementById("workshop-panel");
    this.shopPanel = document.getElementById("shop-panel");

    this.recipeName = document.getElementById("recipe-name");
    this.recipeStats = document.getElementById("recipe-stats");
    this.recipeReqs = document.getElementById("recipe-requirements");
    this.wingsPreview = document.getElementById("wings-preview");
    this.wingsPreviewFull = document.getElementById("wings-preview-full");
    this.workshopGears = document.getElementById("gears");
    this.workshopInvContainer = document.getElementById("workshop-inventory-container");
    this.btnCraft = document.getElementById("btn-craft");
    this.btnPrev = document.getElementById("arrow-prev");
    this.btnNext = document.getElementById("arrow-next");

    this.shopCoinsText = document.getElementById("shop-coins-text");
    this.shopContainer = document.getElementById("shop-items-container");
    this.shopInvContainer = document.getElementById("shop-inventory-container");
    this.shopRecipeReqs = document.getElementById("shop-recipe-requirements");

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnPrev) {
      this.btnPrev.addEventListener("click", () => {
        state.currentRecipeIndex--;
        if (state.currentRecipeIndex < 0) {
          state.currentRecipeIndex = RECIPES.length - 1;
        }
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.updateWorkshop();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener("click", () => {
        state.currentRecipeIndex++;
        if (state.currentRecipeIndex >= RECIPES.length) {
          state.currentRecipeIndex = 0;
        }
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.updateWorkshop();
      });
    }

    if (this.btnCraft) {
      this.btnCraft.addEventListener("click", () => {
        const recipe = RECIPES[state.currentRecipeIndex];
        if (craftAndEquip(recipe)) {
          audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 80);

          if (this.workshopGears) {
            this.workshopGears.classList.remove("spin-anim");
            void this.workshopGears.offsetWidth;
            this.workshopGears.classList.add("spin-anim");
          }

          if (this.hud) this.hud.updateHUD();
          this.updateWorkshop();
        }
      });
    }

    const btnCloseWorkshop = document.getElementById("btn-close-workshop");
    if (btnCloseWorkshop) {
      btnCloseWorkshop.addEventListener("click", () => this.closeWorkshop());
    }

    const btnCloseShop = document.getElementById("btn-close-shop");
    if (btnCloseShop) {
      btnCloseShop.addEventListener("click", () => this.closeShop());
    }

    const shopHintElem = document.getElementById("shop-hint");
    if (shopHintElem) {
      shopHintElem.addEventListener("click", () => this.closeShop());
      shopHintElem.style.cursor = "pointer";
    }
  }

  openWorkshop() {
    state.interactingWithUI = true;
    if (this.modalOverlay) {
      this.modalOverlay.classList.add("visible");
    }
    if (this.workshopPanel) {
      this.workshopPanel.style.display = "block";
      this.workshopPanel.classList.remove("open");
      void this.workshopPanel.offsetWidth;
      this.workshopPanel.classList.add("open");
    }
    this.updateWorkshop();
    if (this.hud) this.hud.updateHUD();
  }

  closeWorkshop() {
    if (this.hud) this.hud.hideTooltip();
    state.interactingWithUI = false;

    if (this.workshopPanel) {
      this.workshopPanel.classList.remove("open");
      setTimeout(() => {
        if (!this.workshopPanel.classList.contains("open")) {
          this.workshopPanel.style.display = "none";
          if (this.hud) this.hud.updateHUD();
        }
      }, 300);
    }

    const isShopOpen = this.shopPanel && this.shopPanel.style.display === "block";
    if (this.modalOverlay && !isShopOpen) {
      this.modalOverlay.classList.remove("visible");
    }

    if (this.hud) this.hud.updateHUD();
  }

  updateWorkshop() {
    const recipe = RECIPES[state.currentRecipeIndex];
    if (!recipe) return;

    const isUnlocked = recipe.tier <= state.currentTier;
    const shadowFilter = "drop-shadow(3px 3px 0px rgba(0, 0, 0, 0.35))";

    if (this.recipeName) {
      const localizedWingName = t(`wing_${recipe.codeName}`) || recipe.displayName;
      this.recipeName.innerText = isUnlocked ? localizedWingName : "???";
    }

    if (this.wingsPreview) {
      this.wingsPreview.style.backgroundImage = `url('assets/ui/${recipe.icon}')`;
      this.wingsPreview.style.filter = isUnlocked ? shadowFilter : `brightness(0) ${shadowFilter}`;
    }

    if (this.wingsPreviewFull) {
      const fullImg = FULL_WING_IMAGES[recipe.codeName] || "assets/wings/wooden_wings1.png";
      this.wingsPreviewFull.style.backgroundImage = `url('${fullImg}')`;
      this.wingsPreviewFull.style.filter = isUnlocked ? shadowFilter : `brightness(0) ${shadowFilter}`;
    }

    if (this.recipeStats) {
      this.recipeStats.innerText = isUnlocked
        ? `${t('speed')}: ${recipe.speed} | ${t('durability')}: ${recipe.durability}`
        : t('lockedRecipe');
    }

    if (this.recipeReqs) {
      if (!isUnlocked) {
        this.recipeReqs.innerHTML = `<div style='font-style:italic; color:#555; font-size:14px;'>${t('climbToDiscover')}</div>`;
      } else {
        let reqHTML = "";
        for (const [itemKey, count] of Object.entries(recipe.requirements)) {
          const currentCount = state.inventory[itemKey] || 0;
          const hasEnough = currentCount >= count;
          const color = hasEnough ? "#1b5e20" : "#b71c1c";
          const itemMeta = ITEM_DATA[itemKey] || { key: itemKey, icon: "assets/items/bag.png" };
          const itemName = t(itemMeta.key) || itemKey;

          reqHTML += `
            <div class="req-row" style="font-size: 14px;">
              <div class="req-icon" style="background-image: url('${itemMeta.icon}'); filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.35));"></div>
              <span style="color: ${color}; font-weight: bold;">${itemName}: ${currentCount} / ${count}</span>
            </div>
          `;
        }
        this.recipeReqs.innerHTML = reqHTML;
      }
    }

    this.updateWorkshopInventory();

    if (this.btnCraft) {
      this.btnCraft.innerText = t('craft');
      this.btnCraft.disabled = !isUnlocked || !canCraftRecipe(recipe);
    }

    const btnCloseWorkshop = document.getElementById("btn-close-workshop");
    if (btnCloseWorkshop) {
      btnCloseWorkshop.innerText = t('exit');
    }
  }

  updateWorkshopInventory() {
    if (!this.workshopInvContainer) return;
    this.workshopInvContainer.innerHTML = "";

    const dropShadow = "drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.35))";

    Object.entries(WORKSHOP_INV_POSITIONS).forEach(([itemKey, pos]) => {
      const count = state.inventory[itemKey] || 0;
      const itemMeta = ITEM_DATA[itemKey] || { key: itemKey, icon: "assets/items/bag.png" };
      const itemName = t(itemMeta.key) || itemKey;

      const slot = document.createElement("div");
      slot.className = "inv-item-slot";
      slot.style.left = `${pos.x}px`;
      slot.style.top = `${pos.y}px`;
      slot.style.boxShadow = "2px 2px 0px rgba(0, 0, 0, 0.35)";

      const icon = document.createElement("div");
      icon.className = "inv-item-icon";
      icon.style.backgroundImage = `url('${itemMeta.icon}')`;
      icon.style.filter = count === 0 ? `grayscale(100%) opacity(0.35) ${dropShadow}` : dropShadow;

      const countText = document.createElement("span");
      countText.className = "inv-item-count";
      countText.innerText = `${count}`;
      countText.style.fontSize = "13px";
      countText.style.textShadow = "1px 1px 0px #000, -1px -1px 0px #000, 1px 1px 0px #000, -1px 1px 0px #000";

      slot.appendChild(icon);
      slot.appendChild(countText);

      slot.addEventListener("mouseenter", (e) => {
        if (this.hud) this.hud.showTooltip(e, `<strong style="color:#ffd700">${itemName}</strong><br/><span style="color:#a5d6a7">${t('owned')} ${count}</span>`);
      });
      slot.addEventListener("mousemove", (e) => {
        if (this.hud) this.hud.updateTooltipPosition(e);
      });
      slot.addEventListener("mouseleave", () => {
        if (this.hud) this.hud.hideTooltip();
      });

      this.workshopInvContainer.appendChild(slot);
    });
  }

  openShop() {
    state.interactingWithUI = true;
    audio.playSound("556710__nachtmahrtv__shop-bell.wav", 80);

    if (this.modalOverlay) {
      this.modalOverlay.classList.add("visible");
    }
    if (this.shopPanel) {
      this.shopPanel.style.display = "block";
      this.shopPanel.classList.remove("open");
      void this.shopPanel.offsetWidth;
      this.shopPanel.classList.add("open");
    }
    this.updateShop();
    if (this.hud) this.hud.updateHUD();
  }

  closeShop() {
    if (this.hud) this.hud.hideTooltip();
    state.interactingWithUI = false;

    if (this.shopPanel) {
      this.shopPanel.classList.remove("open");
      setTimeout(() => {
        if (!this.shopPanel.classList.contains("open")) {
          this.shopPanel.style.display = "none";
          if (this.hud) this.hud.updateHUD();
        }
      }, 300);
    }

    const isWorkshopOpen = this.workshopPanel && this.workshopPanel.style.display === "block" && this.workshopPanel.classList.contains("open");
    if (this.modalOverlay && !isWorkshopOpen) {
      this.modalOverlay.classList.remove("visible");
    }

    if (this.hud) this.hud.updateHUD();
  }

  updateShop() {
    if (this.shopCoinsText) {
      this.shopCoinsText.innerText = `${state.inventory.coin}`;
    }

    const shopHintElem = document.getElementById("shop-hint");
    if (shopHintElem) {
      shopHintElem.innerText = t('shopHint');
    }

    const btnCloseShop = document.getElementById("btn-close-shop");
    if (btnCloseShop) {
      btnCloseShop.innerText = t('exit');
    }

    const recipe = RECIPES[state.currentRecipeIndex];
    if (recipe && this.shopRecipeReqs) {
      const isUnlocked = recipe.tier <= state.currentTier;
      if (!isUnlocked) {
        this.shopRecipeReqs.innerHTML = `<div style='font-style:italic; color:#555; font-size:14px;'>${t('climbToDiscover')}</div>`;
      } else {
        let reqHTML = "";
        for (const [itemKey, count] of Object.entries(recipe.requirements)) {
          const currentCount = state.inventory[itemKey] || 0;
          const hasEnough = currentCount >= count;
          const color = hasEnough ? "#1b5e20" : "#b71c1c";
          const itemMeta = ITEM_DATA[itemKey] || { key: itemKey, icon: "assets/items/bag.png" };
          const itemName = t(itemMeta.key) || itemKey;

          reqHTML += `
            <div class="req-row" style="font-size: 14px;">
              <div class="req-icon" style="background-image: url('${itemMeta.icon}'); filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.35));"></div>
              <span style="color: ${color}; font-weight: bold;">${itemName}: ${currentCount} / ${count}</span>
            </div>
          `;
        }
        this.shopRecipeReqs.innerHTML = reqHTML;
      }
    }

    const dropShadow = "drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.35))";

    if (this.shopContainer) {
      this.shopContainer.innerHTML = "";

      const availableItems = getShopAvailableItems(state.currentTier);

      availableItems.forEach(itemKey => {
        const itemMeta = ITEM_DATA[itemKey] || { key: itemKey, icon: "assets/items/bag.png" };
        const itemName = t(itemMeta.key) || itemKey;

        const pos = getShopItemCounterPosition(itemKey, state.currentTier);

        const card = document.createElement("div");
        card.className = "shop-card ui-element";
        card.style.left = `${pos.x}px`;
        card.style.top = `${pos.y}px`;
        card.style.boxShadow = "3px 3px 0px rgba(0, 0, 0, 0.35)";

        card.innerHTML = `
          <div class="shop-card-icon" style="background-image: url('${itemMeta.icon}'); filter: ${dropShadow}"></div>
        `;

        card.addEventListener("mouseenter", (e) => {
          if (this.hud) this.hud.showTooltip(e, `<strong style="color:#ffdd90; font-size:16px;">${itemName}</strong><br/><span style="color:#81c784; font-size:14px;">${t('buyPrice')}</span>`);
        });
        card.addEventListener("mousemove", (e) => {
          if (this.hud) this.hud.updateTooltipPosition(e);
        });
        card.addEventListener("mouseleave", () => {
          if (this.hud) this.hud.hideTooltip();
        });

        card.addEventListener("click", (e) => {
          e.stopPropagation();
          if (buyItem(itemKey)) {
            audio.playSound("336579__anthousai__coins-in-cloth-05.wav", 80);
            this.updateShop();
            if (this.hud) this.hud.updateHUD();
            if (this.hud) this.hud.showTooltip(e, `<strong style="color:#ffdd90; font-size:16px;">${itemName}</strong><br/><span style="color:#81c784; font-size:14px;">${t('buyPrice')}</span>`);
          } else {
            audio.playSound("566196__scholzi982__press_button_01.wav", 50);
          }
        });

        this.shopContainer.appendChild(card);
      });
    }

    if (this.shopInvContainer) {
      this.shopInvContainer.innerHTML = "";

      Object.entries(SHOP_INV_POSITIONS).forEach(([itemKey, pos]) => {
        const count = state.inventory[itemKey] || 0;
        const itemMeta = ITEM_DATA[itemKey] || { key: itemKey, icon: "assets/items/bag.png" };
        const itemName = t(itemMeta.key) || itemKey;
        const isWax = (itemKey === "wax");

        const slot = document.createElement("div");
        slot.className = "shop-inv-slot ui-element";
        slot.style.left = `${pos.x}px`;
        slot.style.top = `${pos.y}px`;
        slot.style.boxShadow = "2px 2px 0px rgba(0, 0, 0, 0.35)";

        const icon = document.createElement("div");
        icon.className = "inv-item-icon";
        icon.style.backgroundImage = `url('${itemMeta.icon}')`;
        icon.style.filter = count === 0 ? `grayscale(100%) opacity(0.35) ${dropShadow}` : dropShadow;

        const countText = document.createElement("span");
        countText.className = "inv-item-count";
        countText.innerText = `${count}`;
        countText.style.fontSize = "13px";
        countText.style.textShadow = "1px 1px 0px #000, -1px -1px 0px #000, 1px 1px 0px #000, -1px 1px 0px #000";

        slot.appendChild(icon);
        slot.appendChild(countText);

        slot.addEventListener("mouseenter", (e) => {
          if (this.hud) {
            const priceText = isWax
              ? `<span style="color:#ef5350; font-size:13px;">Cannot be sold</span>`
              : `<span style="color:#ffb74d; font-size:14px;">${t('sellValue')}</span>`;

            this.hud.showTooltip(
              e,
              `<strong style="color:#ffdd90; font-size:16px;">${itemName}</strong><br/><span style="font-size:14px;">${t('owned')} ${count}</span><br/>${priceText}`
            );
          }
        });
        slot.addEventListener("mousemove", (e) => {
          if (this.hud) this.hud.updateTooltipPosition(e);
        });
        slot.addEventListener("mouseleave", () => {
          if (this.hud) this.hud.hideTooltip();
        });

        slot.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isWax) {
            audio.playSound("566196__scholzi982__press_button_01.wav", 40);
            return;
          }
          if (sellItem(itemKey)) {
            audio.playSound("336579__anthousai__coins-in-cloth-05.wav", 80);
            this.updateShop();
            if (this.hud) this.hud.updateHUD();
            const newCount = state.inventory[itemKey] || 0;
            if (this.hud) {
              this.hud.showTooltip(
                e,
                `<strong style="color:#ffdd90; font-size:16px;">${itemName}</strong><br/><span style="font-size:14px;">${t('owned')} ${newCount}</span><br/><span style="color:#ffb74d; font-size:14px;">${t('sellValue')}</span>`
              );
            }
          }
        });

        this.shopInvContainer.appendChild(slot);
      });
    }
  }
}