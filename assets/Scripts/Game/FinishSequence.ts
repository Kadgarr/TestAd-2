import { _decorator, Component, Node, Quat, tween, Vec3 } from 'cc';
import { gameEvents, GameEvent } from './GameConfig';
import { StackController } from './StackController';
const { ccclass, property } = _decorator;

const _p = new Vec3();
const _q = new Quat();

/**
 * Финал: блоки по очереди летят из рук в ниши пирамиды, при победе вершину закрывает золотой блок.
 * Слоты — пустые узлы на пирамиде (позже — Empty Slot_01... из Blender). Дочерний узел слота = визуал ниши, скрывается при заполнении.
 */
@ccclass('FinishSequence')
export class FinishSequence extends Component {
    @property({ type: [Node], tooltip: 'Слоты в порядке заполнения (снизу вверх)' })
    slots: Node[] = [];

    @property({ type: Node, tooltip: 'Золотой блок на вершине (скрыт до победы)' })
    goldBlock: Node | null = null;

    @property({ type: Node, tooltip: 'Трансформ камеры на финише' })
    cameraPoint: Node | null = null;

    @property({ tooltip: 'Пауза перед первым блоком, с' })
    startDelay = 0.6;

    @property({ tooltip: 'Полёт одного блока, с' })
    flyDuration = 0.45;

    @property({ tooltip: 'Интервал между блоками, с' })
    flyInterval = 0.18;

    @property({ tooltip: 'Высота дуги полёта, м' })
    arcHeight = 2.5;

    @property({ tooltip: 'Масштаб блока в нише (относительно блока в руках)' })
    slotScale = 1.8;

    private _goldTarget = new Vec3();

    onLoad() {
        if (this.goldBlock) {
            this._goldTarget.set(this.goldBlock.position);
            this.goldBlock.active = false;
        }
    }

    play(stack: StackController, blocksToWin: number, onDone: (win: boolean) => void) {
        const blocks = stack.takeAll();
        const win = blocks.length >= blocksToWin;

        if (!win) {
            stack.scatter(blocks, false);
            this.scheduleOnce(() => onDone(false), 1.0);
            return;
        }

        const n = Math.min(blocks.length, this.slots.length);
        // Лишние блоки (если собрано больше, чем ниш) — рассыпаются.
        if (blocks.length > n) stack.scatter(blocks.slice(n), false);

        for (let i = 0; i < n; i++) {
            // Берём сверху стопки, заполняем снизу пирамиды.
            const block = blocks[n - 1 - i];
            const slot = this.slots[i];
            this.scheduleOnce(() => this._fly(block, slot, i + 1, n), i * this.flyInterval);
        }

        const total = (n - 1) * this.flyInterval + this.flyDuration + 0.25;
        this.scheduleOnce(() => this._placeGold(() => onDone(true)), total);
    }

    private _fly(block: Node, slot: Node, placed: number, total: number) {
        block.setParent(this.node.scene, true);
        const from = block.worldPosition.clone();
        const fromR = block.worldRotation.clone();
        const to = slot.worldPosition.clone();
        const toR = slot.worldRotation.clone();
        const fromS = block.scale.clone();
        const toS = new Vec3(this.slotScale, this.slotScale, this.slotScale);
        const s = { t: 0 };
        tween(s).to(this.flyDuration, { t: 1 }, {
            easing: 'sineInOut',
            onUpdate: () => {
                const t = s.t;
                Vec3.lerp(_p, from, to, t);
                _p.y += Math.sin(Math.PI * t) * this.arcHeight;
                block.setWorldPosition(_p);
                Quat.slerp(_q, fromR, toR, t);
                block.setWorldRotation(_q);
                Vec3.lerp(_p, fromS, toS, t);
                block.setScale(_p);
            },
        }).call(() => {
            for (const c of slot.children) c.active = false;
            block.setParent(slot, true);
            const up = toS.clone().multiplyScalar(1.2);
            tween(block).to(0.07, { scale: up }).to(0.12, { scale: toS }, { easing: 'backOut' }).start();
            gameEvents.emit(GameEvent.BLOCK_PLACED, placed, total, slot.worldPosition.clone());
        }).start();
    }

    private _placeGold(done: () => void) {
        const g = this.goldBlock;
        if (!g) { done(); return; }
        g.active = true;
        const start = this._goldTarget.clone();
        start.y += 4;
        g.setPosition(start);
        tween(g)
            .to(0.5, { position: this._goldTarget }, { easing: 'bounceOut' })
            .delay(0.3)
            .call(done)
            .start();
    }
}
