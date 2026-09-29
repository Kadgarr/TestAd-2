import { _decorator, Component, Node, ParticleSystem, Vec3 } from 'cc';
import { CameraFollow } from './CameraFollow';
import { gameEvents, GameEvent } from './GameConfig';
const { ccclass, property } = _decorator;

const _v = new Vec3();

/**
 * Эффекты: искры при подборе блока, пыль и тряска камеры при ударе, пыль и искры при установке блока в нишу,
 * салют над пирамидой при победе. Системы частиц лежат в сцене дочерними узлами и переиспользуются.
 */
@ccclass('FXManager')
export class FXManager extends Component {
    @property({ type: ParticleSystem, tooltip: 'Искры при подборе блока' })
    pickup: ParticleSystem | null = null;

    @property({ type: ParticleSystem, tooltip: 'Облачко пыли при ударе о ловушку' })
    hitDust: ParticleSystem | null = null;

    @property({ type: ParticleSystem, tooltip: 'Пыль при установке блока в нишу' })
    placeDust: ParticleSystem | null = null;

    @property({ type: ParticleSystem, tooltip: 'Искры при установке блока в нишу' })
    placeStars: ParticleSystem | null = null;

    @property({ type: [ParticleSystem], tooltip: 'Залпы салюта (используются по кругу)' })
    fireworks: ParticleSystem[] = [];

    @property({ type: Node, tooltip: 'Центр салюта (вершина пирамиды)' })
    fireworksCenter: Node | null = null;

    @property({ tooltip: 'Число залпов салюта' })
    fireworksCount = 6;

    @property({ tooltip: 'Интервал между залпами, с' })
    fireworksInterval = 0.28;

    @property({ type: CameraFollow })
    cameraFollow: CameraFollow | null = null;

    @property({ tooltip: 'Амплитуда тряски камеры при ударе, м' })
    shakeAmount = 0.18;

    @property({ tooltip: 'Длительность тряски, с' })
    shakeDuration = 0.25;

    onLoad() {
        gameEvents.on(GameEvent.BLOCK_PLACED, this._onPlaced, this);
        gameEvents.on(GameEvent.RESULT, this._onResult, this);
    }

    onDestroy() {
        gameEvents.off(GameEvent.BLOCK_PLACED, this._onPlaced, this);
        gameEvents.off(GameEvent.RESULT, this._onResult, this);
    }


    playPickup(pos: Vec3) {
        this._burst(this.pickup, pos);
    }

    playHit(pos: Vec3) {
        _v.set(pos.x, pos.y + 0.3, pos.z - 0.4);
        this._burst(this.hitDust, _v);
        this.cameraFollow?.shake(this.shakeAmount, this.shakeDuration);
    }

    private _onPlaced(_placed: number, _total: number, pos?: Vec3) {
        if (!pos) return;
        this._burst(this.placeDust, pos);
        this._burst(this.placeStars, pos);
    }

    private _onResult(win: boolean) {
        if (!win || !this.fireworksCenter || this.fireworks.length === 0) return;
        for (let i = 0; i < this.fireworksCount; i++) {
            this.scheduleOnce(() => {
                const c = this.fireworksCenter!.worldPosition;
                const a = Math.random() * Math.PI * 2;
                const r = 2 + Math.random() * 3;
                _v.set(c.x + Math.cos(a) * r, c.y + 2 + Math.random() * 3, c.z + Math.sin(a) * r * 0.4);
                this._burst(this.fireworks[i % this.fireworks.length], _v);
            }, i * this.fireworksInterval);
        }
    }

    private _burst(ps: ParticleSystem | null, pos: Vec3) {
        if (!ps) return;
        ps.node.setWorldPosition(pos);
        ps.stop();
        ps.clear();
        ps.play();
    }
}
