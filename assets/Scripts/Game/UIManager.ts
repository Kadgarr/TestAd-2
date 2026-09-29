import { _decorator, Color, Component, director, EventTouch, Label, Node, Sprite, Tween, tween, Vec3 } from 'cc';
import { PlayableSDK } from '../Core/PlayableSDK';
import { gameEvents, GameEvent } from './GameConfig';
const { ccclass, property } = _decorator;

/** HUD (шкала прогресса + иконка пирамиды), туториал, надпись результата, End Card. */
@ccclass('UIManager')
export class UIManager extends Component {
    @property({ type: Node, tooltip: 'Корень HUD' })
    hud: Node | null = null;

    @property({ type: Node, tooltip: 'Узел шкалы (пульсирует при изменениях)' })
    progressBar: Node | null = null;

    @property({ type: [Sprite], tooltip: 'Сегменты шкалы, по одному на нишу пирамиды' })
    segments: Sprite[] = [];

    @property({ type: Label, tooltip: 'Надпись TOTAL BLOCKS' })
    countLabel: Label | null = null;

    @property({ type: Node, tooltip: 'Отметка порога победы на шкале (ставится по blocksToWin из GameManager)' })
    thresholdMarker: Node | null = null;

    @property({ type: Node, tooltip: 'Иконка пирамиды справа от шкалы' })
    pyramidIcon: Node | null = null;

    @property({ type: Node })
    tutorial: Node | null = null;

    @property({ type: Node })
    tutorialHand: Node | null = null;

    @property({ type: Label })
    resultLabel: Label | null = null;

    @property({ type: Node })
    endCard: Node | null = null;

    @property({ type: Label })
    endCardTitle: Label | null = null;

    @property({ type: Node })
    ctaButton: Node | null = null;

    @property({ type: Node })
    retryButton: Node | null = null;

    @property({ type: Node, tooltip: 'Иконка игры на End Card (появляется с отскоком и слегка покачивается)' })
    endCardIcon: Node | null = null;

    @property({ type: Node, tooltip: 'Лучи за иконкой (медленно вращаются)' })
    endCardBurst: Node | null = null;

    @property({ tooltip: 'Весь End Card кликабелен как CTA' })
    fullscreenCta = true;

    @property segmentEmpty = new Color(70, 55, 40, 255);
    @property segmentFull = new Color(255, 205, 40, 255);
    @property segmentLost = new Color(230, 60, 50, 255);
    @property winColor = new Color(255, 210, 60, 255);
    @property failColor = new Color(235, 70, 60, 255);

    private _count = 0;

    onLoad() {
        gameEvents.on(GameEvent.STACK_CHANGED, this._onStack, this);
        gameEvents.on(GameEvent.BLOCK_PLACED, this._onPlaced, this);

        this.ctaButton?.on(Node.EventType.TOUCH_END, this._onCta, this);
        this.retryButton?.on(Node.EventType.TOUCH_END, this._onRetry, this);
        this.endCard?.on(Node.EventType.TOUCH_END, this._onEndCardTap, this);

        if (this.tutorial) this.tutorial.active = false;
        if (this.resultLabel) this.resultLabel.node.active = false;
        if (this.endCard) this.endCard.active = false;
        this._refresh();
    }

    onDestroy() {
        gameEvents.off(GameEvent.STACK_CHANGED, this._onStack, this);
        gameEvents.off(GameEvent.BLOCK_PLACED, this._onPlaced, this);
    }

    /** Поставить отметку порога между сегментами n и n+1. */
    setWinThreshold(n: number) {
        const m = this.thresholdMarker;
        const segs = this.segments;
        if (!m || segs.length === 0) return;
        const k = Math.max(1, Math.min(n, segs.length));
        const a = segs[k - 1].node.position;
        const x = k < segs.length ? (a.x + segs[k].node.position.x) / 2 : a.x + 17;
        m.setPosition(x, m.position.y, 0);
        m.active = n <= segs.length;
    }

    showTutorial() {
        if (!this.tutorial) return;
        this.tutorial.active = true;
        const hand = this.tutorialHand;
        if (hand) {
            const base = hand.position.clone();
            tween(hand)
                .to(0.6, { position: new Vec3(base.x + 140, base.y, 0) }, { easing: 'sineInOut' })
                .to(0.6, { position: new Vec3(base.x - 140, base.y, 0) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }
    }

    hideTutorial() {
        if (!this.tutorial) return;
        if (this.tutorialHand) Tween.stopAllByTarget(this.tutorialHand);
        this.tutorial.active = false;
    }

    showResult(win: boolean) {
        const l = this.resultLabel;
        if (!l) return;
        l.string = win ? "PHARAOH'S PYRAMID BUILT!" : 'NOT ENOUGH BLOCKS!';
        l.color = win ? this.winColor : this.failColor;
        l.node.active = true;
        l.node.setScale(0, 0, 1);
        tween(l.node).to(0.35, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    showEndCard(win: boolean) {
        if (this.hud) this.hud.active = false;
        if (this.resultLabel) this.resultLabel.node.active = false;
        if (!this.endCard) return;
        this.endCard.active = true;
        if (this.endCardTitle) this.endCardTitle.string = win ? "PHARAOH'S PYRAMID BUILT!" : 'NOT ENOUGH BLOCKS!';
        if (this.retryButton) this.retryButton.active = !win;
        this.endCard.setScale(0.85, 0.85, 1);
        tween(this.endCard).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        const icon = this.endCardIcon;
        if (icon) {
            icon.setScale(0, 0, 1);
            tween(icon)
                .delay(0.15)
                .to(0.45, { scale: Vec3.ONE }, { easing: 'backOut' })
                .call(() => {
                    tween(icon)
                        .to(1.2, { angle: 4 }, { easing: 'sineInOut' })
                        .to(1.2, { angle: -4 }, { easing: 'sineInOut' })
                        .union()
                        .repeatForever()
                        .start();
                })
                .start();
        }
        const burst = this.endCardBurst;
        if (burst) {
            burst.active = win;
            burst.angle = 0;
            tween(burst).by(10, { angle: -360 }).repeatForever().start();
        }
        if (this.ctaButton) {
            tween(this.ctaButton)
                .to(0.45, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' })
                .to(0.45, { scale: Vec3.ONE }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }
    }

    private _onStack(count: number, delta: number) {
        const prev = this._count;
        this._count = count;
        this._refresh();

        if (delta < 0) {
            for (let i = count; i < Math.min(prev, this.segments.length); i++) {
                const sp = this.segments[i];
                if (!sp) continue;
                sp.color = this.segmentLost;
                tween(sp).delay(0.15).to(0.3, { color: this.segmentEmpty }).start();
            }
        }
        this._pulse(this.progressBar, delta < 0 ? 1.05 : 1.1);
    }

    private _onPlaced() {
        this._pulse(this.pyramidIcon, 1.25);
    }

    private _refresh() {
        for (let i = 0; i < this.segments.length; i++) {
            const sp = this.segments[i];
            if (!sp) continue;
            Tween.stopAllByTarget(sp);
            sp.color = i < this._count ? this.segmentFull : this.segmentEmpty;
        }
        if (this.countLabel) this.countLabel.string = `TOTAL BLOCKS: ${this._count}`;
    }

    private _pulse(n: Node | null, s: number) {
        if (!n) return;
        Tween.stopAllByTarget(n);
        n.setScale(1, 1, 1);
        tween(n).to(0.08, { scale: new Vec3(s, s, 1) }).to(0.15, { scale: Vec3.ONE }, { easing: 'quadOut' }).start();
    }

    private _onCta(e: EventTouch) {
        e.propagationStopped = true;
        PlayableSDK.openStore();
    }

    private _onRetry(e: EventTouch) {
        e.propagationStopped = true;
        const scene = director.getScene();
        if (scene) director.loadScene(scene.name);
    }

    private _onEndCardTap() {
        if (this.fullscreenCta) PlayableSDK.openStore();
    }
}
