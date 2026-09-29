import { _decorator, Component, Enum, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum ObstacleKind {
    Scarab,
    Barrier,
    Spikes,
}
Enum(ObstacleKind);

/** Ловушка на трассе. Удар сбивает knockCount блоков из стопки (мягкий Fail). */
@ccclass('Obstacle')
export class Obstacle extends Component {
    static readonly all: Obstacle[] = [];

    @property({ type: Enum(ObstacleKind) })
    kind: ObstacleKind = ObstacleKind.Scarab;

    @property({ tooltip: 'Половина ширины зоны удара по X, м (барьер на 2 линии ≈ 1.3)' })
    halfWidth = 0.45;

    @property({ tooltip: 'Половина глубины зоны удара по Z, м' })
    halfDepth = 0.35;

    @property({ tooltip: 'Сколько блоков сбивает удар', min: 0 })
    knockCount = 1;

    @property({ tooltip: 'Лёгкая анимация «ползания» (для скарабея)' })
    wiggle = false;

    hit = false;

    private _t = Math.random() * 10;
    private _baseYaw = 0;

    onLoad() {
        this._baseYaw = this.node.eulerAngles.y;
    }

    onEnable() {
        if (Obstacle.all.indexOf(this) < 0) Obstacle.all.push(this);
    }

    onDisable() {
        const i = Obstacle.all.indexOf(this);
        if (i >= 0) Obstacle.all.splice(i, 1);
    }

    onHit() {
        this.hit = true;
        tween(this.node)
            .by(0.08, { position: new Vec3(0, 0.18, 0) }, { easing: 'quadOut' })
            .by(0.14, { position: new Vec3(0, -0.18, 0) }, { easing: 'quadIn' })
            .start();
    }

    update(dt: number) {
        if (!this.wiggle) return;
        this._t += dt;
        this.node.setRotationFromEuler(0, this._baseYaw + Math.sin(this._t * 5) * 12, 0);
    }
}
