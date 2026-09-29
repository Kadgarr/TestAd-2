import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/** Блок на трассе, который можно подобрать. */
@ccclass('Collectible')
export class Collectible extends Component {
    static readonly all: Collectible[] = [];

    @property({ tooltip: 'Радиус подбора по X и Z, м' })
    pickRadius = 0.65;

    @property({ tooltip: 'Амплитуда покачивания вверх-вниз, м' })
    bobAmplitude = 0.08;

    @property({ tooltip: 'Скорость вращения, град/с' })
    spinSpeed = 60;

    collected = false;

    private _baseY = 0;
    private _t = Math.random() * 10;

    onLoad() {
        this._baseY = this.node.position.y;
    }

    onEnable() {
        if (Collectible.all.indexOf(this) < 0) Collectible.all.push(this);
    }

    onDisable() {
        this._unregister();
    }

    markCollected() {
        this.collected = true;
        this._unregister();
    }

    update(dt: number) {
        if (this.collected) return;
        this._t += dt;
        const p = this.node.position;
        this.node.setPosition(p.x, this._baseY + Math.sin(this._t * 3) * this.bobAmplitude, p.z);
        this.node.setRotationFromEuler(0, (this._t * this.spinSpeed) % 360, 0);
    }

    private _unregister() {
        const i = Collectible.all.indexOf(this);
        if (i >= 0) Collectible.all.splice(i, 1);
    }
}
