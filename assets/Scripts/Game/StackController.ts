import { _decorator, Component, Node, Quat, Tween, tween, Vec3 } from 'cc';
import { gameEvents, GameEvent } from './GameConfig';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

interface Debris {
    node: Node;
    vel: Vec3;
    spin: Vec3;
    life: number;
    bounced: boolean;
}

const _tmpV = new Vec3();
const _tmpQ = new Quat();

/** Стопка блоков в руках: подбор, покачивание, сбитие блоков, рассыпание. */
@ccclass('StackController')
export class StackController extends Component {
    @property({ type: Node, tooltip: 'Точка основания стопки перед руками (дочерний узел игрока)' })
    handAnchor: Node | null = null;

    @property({ type: PlayerController })
    player: PlayerController | null = null;

    @property({ tooltip: 'Высота блока в стопке, м' })
    blockHeight = 0.5;

    @property({ tooltip: 'Длительность прилёта блока в руки, с' })
    pickupDuration = 0.25;

    @property({ tooltip: 'Высота дуги прилёта, м' })
    pickupArc = 0.8;

    @property({ tooltip: 'Инерция стопки при перестроении' })
    swayFactor = 0.03;

    @property({ tooltip: 'Покачивание стопки при беге, м на блок' })
    wobbleAmplitude = 0.012;

    @property({ tooltip: 'Высота земли для отскока сбитых блоков, м' })
    groundY = 0.25;

    readonly blocks: Node[] = [];

    private _settled = new Set<Node>();
    private _debris: Debris[] = [];
    private _sway = 0;
    private _t = 0;

    get count() { return this.blocks.length; }

    /** Забрать блок с трассы в стопку. */
    add(block: Node) {
        if (!this.handAnchor) return;
        block.setParent(this.handAnchor, true);
        const idx = this.blocks.length;
        this.blocks.push(block);

        const start = block.position.clone();
        const startRot = block.rotation.clone();
        const end = new Vec3(0, idx * this.blockHeight, 0);
        const state = { t: 0 };
        tween(state)
            .to(this.pickupDuration, { t: 1 }, {
                easing: 'quadOut',
                onUpdate: () => {
                    const t = state.t;
                    Vec3.lerp(_tmpV, start, end, t);
                    _tmpV.y += Math.sin(Math.PI * t) * this.pickupArc;
                    block.setPosition(_tmpV);
                    Quat.slerp(_tmpQ, startRot, Quat.IDENTITY, t);
                    block.setRotation(_tmpQ);
                },
            })
            .call(() => {
                if (this.blocks.indexOf(block) < 0) return;
                this._settled.add(block);
                tween(block).to(0.06, { scale: new Vec3(1.2, 0.85, 1.2) }).to(0.1, { scale: Vec3.ONE }).start();
            })
            .start();

        this.player?.setCarry(true);
        gameEvents.emit(GameEvent.STACK_CHANGED, this.blocks.length, 1);
    }

    /** Сбить n верхних блоков (удар о ловушку). */
    knock(n: number) {
        const removed: Node[] = [];
        for (let i = 0; i < n && this.blocks.length > 0; i++) removed.push(this.blocks.pop()!);
        if (removed.length === 0) return;
        this.scatter(removed, true);
        if (this.blocks.length === 0) this.player?.setCarry(false);
        gameEvents.emit(GameEvent.STACK_CHANGED, this.blocks.length, -removed.length);
    }

    /** Отдать все блоки (снизу вверх) без события уменьшения — для финальной постройки. */
    takeAll(): Node[] {
        const list = this.blocks.slice();
        this.blocks.length = 0;
        for (const b of list) { this._settled.delete(b); Tween.stopAllByTarget(b); }
        return list;
    }

    /** Разбросать блоки с «физикой». backward = отлетают назад (игрок бежит). */
    scatter(nodes: Node[], backward: boolean) {
        const root = this.node.scene;
        for (const b of nodes) {
            this._settled.delete(b);
            Tween.stopAllByTarget(b);
            b.setParent(root, true);
            const side = Math.random() < 0.5 ? -1 : 1;
            const vel = new Vec3(
                side * (1.5 + Math.random() * 2.5),
                3 + Math.random() * 2.5,
                backward ? 2 + Math.random() * 3 : (Math.random() - 0.5) * 3,
            );
            const spin = new Vec3((Math.random() - 0.5) * 720, (Math.random() - 0.5) * 720, (Math.random() - 0.5) * 720);
            this._debris.push({ node: b, vel, spin, life: 1.4, bounced: false });
        }
    }

    update(dt: number) {
        this._t += dt;
        this._updateWobble(dt);
        this._updateDebris(dt);
    }

    private _updateWobble(dt: number) {
        const lat = this.player ? this.player.lateralVelocity : 0;
        this._sway += (-lat * this.swayFactor - this._sway) * Math.min(1, dt * 6);
        const running = this.player ? this.player.running : false;
        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            if (!this._settled.has(b)) continue;
            const wob = running ? Math.sin(this._t * 9 - i * 0.6) * this.wobbleAmplitude * i : 0;
            b.setPosition(this._sway * i + wob, i * this.blockHeight, 0);
            b.setRotationFromEuler(0, 0, -this._sway * 40 * Math.min(1, i / 4));
        }
    }

    private _updateDebris(dt: number) {
        for (let i = this._debris.length - 1; i >= 0; i--) {
            const d = this._debris[i];
            d.vel.y -= 18 * dt;
            const p = d.node.worldPosition;
            _tmpV.set(p.x + d.vel.x * dt, p.y + d.vel.y * dt, p.z + d.vel.z * dt);
            if (_tmpV.y < this.groundY && d.vel.y < 0) {
                _tmpV.y = this.groundY;
                if (!d.bounced) {
                    d.bounced = true;
                    d.vel.y *= -0.35;
                    d.vel.x *= 0.5;
                    d.vel.z *= 0.5;
                    d.spin.multiplyScalar(0.4);
                } else {
                    d.vel.set(0, 0, 0);
                    d.spin.set(0, 0, 0);
                }
            }
            d.node.setWorldPosition(_tmpV);
            const e = d.node.eulerAngles;
            d.node.setRotationFromEuler(e.x + d.spin.x * dt, e.y + d.spin.y * dt, e.z + d.spin.z * dt);

            d.life -= dt;
            if (d.life <= 0) {
                this._debris.splice(i, 1);
                const n = d.node;
                tween(n).to(0.25, { scale: Vec3.ZERO }, { easing: 'quadIn' }).call(() => { n.active = false; }).start();
            }
        }
    }
}
