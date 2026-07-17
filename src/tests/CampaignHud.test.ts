import { describe, expect, it, vi } from 'vitest';
import {
  CampaignHud,
  type CampaignHudElement,
  type CampaignHudElements,
} from '../campaign/CampaignHud';
import type { CampaignRuntimeViewModel } from '../campaign/CampaignRuntime';

function createElement(): CampaignHudElement & {
  click: () => void;
} {
  let clickHandler: EventListener | null = null;
  return {
    hidden: false,
    textContent: '',
    style: {},
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    },
    click() {
      clickHandler?.({} as Event);
    },
  };
}

function createElements(): CampaignHudElements {
  return {
    root: createElement(),
    eyebrow: createElement(),
    title: createElement(),
    objective: createElement(),
    progressLabel: createElement(),
    progressFill: createElement(),
    reward: createElement(),
    action: createElement(),
    defense: createElement(),
  };
}

function createView(
  overrides: Partial<CampaignRuntimeViewModel> = {},
): CampaignRuntimeViewModel {
  return {
    visible: true,
    eyebrow: '基地战役 · 第 2 章',
    title: '点亮炉火',
    objective: '放置工作台和熔炉',
    progressLabel: '1/2',
    progressRatio: 0.5,
    reward: '奖励：木板 × 12',
    actionLabel: '开始守夜',
    defenseLabel: null,
    ...overrides,
  };
}

describe('CampaignHud', () => {
  it('renders campaign copy, progress, and the ready action', () => {
    const elements = createElements();
    const hud = new CampaignHud(elements);

    hud.render(createView());

    expect(elements.root.hidden).toBe(false);
    expect(elements.eyebrow.textContent).toBe('基地战役 · 第 2 章');
    expect(elements.title.textContent).toBe('点亮炉火');
    expect(elements.objective.textContent).toBe('放置工作台和熔炉');
    expect(elements.progressLabel.textContent).toBe('1/2');
    expect(elements.progressFill.style.width).toBe('50%');
    expect(elements.reward.textContent).toBe('奖励：木板 × 12');
    expect(elements.action.hidden).toBe(false);
    expect(elements.action.textContent).toBe('开始守夜 · F');
    expect(elements.defense.hidden).toBe(true);
  });

  it('clamps progress and switches to the defense status', () => {
    const elements = createElements();
    const hud = new CampaignHud(elements);

    hud.render(createView({
      progressRatio: 1.5,
      actionLabel: null,
      defenseLabel: '剩余 24 秒 · 击败 3/5',
    }));

    expect(elements.progressFill.style.width).toBe('100%');
    expect(elements.action.hidden).toBe(true);
    expect(elements.defense.hidden).toBe(false);
    expect(elements.defense.textContent).toBe('剩余 24 秒 · 击败 3/5');

    hud.render(createView({ progressRatio: -1 }));
    expect(elements.progressFill.style.width).toBe('0%');
  });

  it('hides itself and forwards action clicks', () => {
    const elements = createElements();
    const onAction = vi.fn();
    const hud = new CampaignHud(elements);
    hud.setActionHandler(onAction);

    hud.render(createView({ visible: false }));
    (elements.action as ReturnType<typeof createElement>).click();

    expect(elements.root.hidden).toBe(true);
    expect(onAction).toHaveBeenCalledOnce();
  });
});
