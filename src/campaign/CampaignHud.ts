import type { CampaignRuntimeViewModel } from './CampaignRuntime';

export interface CampaignHudElement {
  hidden: boolean | string;
  textContent: string | null;
  style: {
    width?: string;
  };
  addEventListener(type: string, handler: EventListener): void;
}

export interface CampaignHudElements {
  root: CampaignHudElement;
  eyebrow: CampaignHudElement;
  title: CampaignHudElement;
  objective: CampaignHudElement;
  progressLabel: CampaignHudElement;
  progressFill: CampaignHudElement;
  reward: CampaignHudElement;
  action: CampaignHudElement;
  defense: CampaignHudElement;
}

export class CampaignHud {
  private readonly elements: CampaignHudElements;
  private actionHandler: (() => void) | null = null;

  constructor(elements: CampaignHudElements) {
    this.elements = elements;
    this.elements.action.addEventListener('click', () => {
      this.actionHandler?.();
    });
  }

  static mount(parent: HTMLElement): CampaignHud {
    const root = document.createElement('section');
    root.className = 'campaign-hud';
    root.hidden = true;
    root.innerHTML = `
      <div class="campaign-hud__eyebrow"></div>
      <div class="campaign-hud__title"></div>
      <div class="campaign-hud__objective"></div>
      <div class="campaign-hud__progress">
        <div class="campaign-hud__progress-fill"></div>
        <span class="campaign-hud__progress-label"></span>
      </div>
      <div class="campaign-hud__defense" hidden></div>
      <div class="campaign-hud__footer">
        <span class="campaign-hud__reward"></span>
        <button class="campaign-hud__action" type="button" hidden></button>
      </div>
    `;
    parent.appendChild(root);

    const find = (selector: string): HTMLElement => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing campaign HUD element: ${selector}`);
      return element;
    };

    return new CampaignHud({
      root,
      eyebrow: find('.campaign-hud__eyebrow'),
      title: find('.campaign-hud__title'),
      objective: find('.campaign-hud__objective'),
      progressLabel: find('.campaign-hud__progress-label'),
      progressFill: find('.campaign-hud__progress-fill'),
      reward: find('.campaign-hud__reward'),
      action: find('.campaign-hud__action'),
      defense: find('.campaign-hud__defense'),
    });
  }

  setActionHandler(handler: () => void): void {
    this.actionHandler = handler;
  }

  render(view: CampaignRuntimeViewModel): void {
    const {
      root,
      eyebrow,
      title,
      objective,
      progressLabel,
      progressFill,
      reward,
      action,
      defense,
    } = this.elements;

    root.hidden = !view.visible;
    eyebrow.textContent = view.eyebrow;
    title.textContent = view.title;
    objective.textContent = view.objective;
    progressLabel.textContent = view.progressLabel;
    progressFill.style.width = `${Math.round(
      Math.min(1, Math.max(0, view.progressRatio)) * 100,
    )}%`;
    reward.textContent = view.reward;

    action.hidden = view.actionLabel === null;
    action.textContent = view.actionLabel ? `${view.actionLabel} · F` : '';
    defense.hidden = view.defenseLabel === null;
    defense.textContent = view.defenseLabel ?? '';
  }
}
