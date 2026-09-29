import { _decorator, Component, EventKeyboard, EventTouch, Input, input, KeyCode, Node, SkeletalAnimation } from 'cc';
import { LANES } from './GameConfig';
const { ccclass, property } = _decorator;

type AnimMode = 'idle' | 'run' | 'carry' | 'stumble' | 'victory';

/**
 * Бег вперёд по -Z и перестроение между линиями свайпом / drag (или стрелками / A-D на ПК).
 * Анимации — скелетные клипы из Hero.glb (Blender): Idle, Run, CarryRun, Stumble, Victory.
 * Кодом остаётся только крен корпуса при смене линии.
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: 'Скорость бега, м/с' })
    runSpeed = 8;

    @property({ tooltip: 'Резкость перестроения между линиями' })
    laneLerp = 14;

    @property({ tooltip: 'Длина свайпа для смены линии, в единицах UI' })
    swipeThreshold = 40;

    @property({ tooltip: 'Доля скорости сразу после удара' })
    hitSlowdown = 0.45;

    @property({ type: Node, tooltip: 'Визуальная модель: крен при смене линии' })
    visual: Node | null = null;

    @property({ type: SkeletalAnimation, tooltip: 'SkeletalAnimation персонажа (Hero)' })
    anim: SkeletalAnimation | null = null;

    @property({ tooltip: 'Скорость бега, под которую сделан клип Run (при ней клип играет с x1)' })
    clipRunSpeed = 12;

    @property({ tooltip: 'Длительность кроссфейда между клипами, с' })
    crossFade = 0.15;

    @property({ tooltip: 'Максимальный крен корпуса при смене линии, градусы' })
    maxRoll = 15;

    lane = 1;
    running = false;
    inputEnabled = false;
    /** Боковая скорость, м/с — для инерции стопки. */
    lateralVelocity = 0;

    private _speedMul = 1;
    private _touchX = 0;
    private _touching = false;
    private _carry = false;
    private _mode: AnimMode | null = null;
    private _stumbleLeft = 0;
    private _roll = 0;

    onEnable() {
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this._onKey, this);
    }

    onDisable() {
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this._onKey, this);
    }

    start() {
        this._play('idle', 0);
    }

    startRun() {
        this.running = true;
        this.inputEnabled = true;
        this._play(this._carry ? 'carry' : 'run');
    }

    stop() {
        this.running = false;
        this.inputEnabled = false;
        if (this._mode !== 'victory') this._play('idle', 0.25);
    }

    /** Финал: победа — клип Victory, поражение — Idle. */
    celebrate(win: boolean) {
        this.running = false;
        this.inputEnabled = false;
        this._play(win ? 'victory' : 'idle', 0.3);
    }

    setCarry(carry: boolean) {
        this._carry = carry;
        if (this.running && (this._mode === 'run' || this._mode === 'carry')) this._play(carry ? 'carry' : 'run');
    }

    stumble() {
        this._speedMul = this.hitSlowdown;
        if (!this.running) return;
        this._play('stumble', 0.08);
        const st = this.anim?.getState('Stumble');
        this._stumbleLeft = st ? st.duration / Math.max(0.01, st.speed) : 0.6;
    }

    shiftLane(dir: number) {
        if (!this.inputEnabled) return;
        this.lane = Math.max(0, Math.min(LANES.length - 1, this.lane + dir));
    }

    update(dt: number) {
        const p = this.node.position;

        let z = p.z;
        if (this.running) {
            this._speedMul += (1 - this._speedMul) * Math.min(1, dt * 1.5);
            z -= this.runSpeed * this._speedMul * dt;
        }

        const tx = LANES[this.lane];
        const k = 1 - Math.exp(-this.laneLerp * dt);
        const nx = p.x + (tx - p.x) * k;
        this.lateralVelocity = dt > 0 ? (nx - p.x) / dt : 0;
        this.node.setPosition(nx, p.y, z);

        if (this._mode === 'stumble') {
            this._stumbleLeft -= dt;
            if (this._stumbleLeft <= 0 && this.running) this._play(this._carry ? 'carry' : 'run', 0.12);
        }
        this._updateRunSpeed();

        if (this.visual) {
            const target = this.running ? Math.max(-this.maxRoll, Math.min(this.maxRoll, -this.lateralVelocity * 2.5)) : 0;
            this._roll += (target - this._roll) * Math.min(1, dt * 12);
            this.visual.setRotationFromEuler(0, 0, this._roll);
        }
    }

    private _clipName(m: AnimMode): string {
        switch (m) {
            case 'run': return 'Run';
            case 'carry': return 'CarryRun';
            case 'stumble': return 'Stumble';
            case 'victory': return 'Victory';
            default: return 'Idle';
        }
    }

    private _play(m: AnimMode, fade = this.crossFade) {
        if (this._mode === m) return;
        this._mode = m;
        if (!this.anim) return;
        const name = this._clipName(m);
        if (!this.anim.getState(name)) return;
        if (fade <= 0) this.anim.play(name);
        else this.anim.crossFade(name, fade);
        this._updateRunSpeed();
    }

    private _updateRunSpeed() {
        if (!this.anim || (this._mode !== 'run' && this._mode !== 'carry')) return;
        const st = this.anim.getState(this._clipName(this._mode));
        if (st) st.speed = Math.max(0.3, (this.runSpeed * this._speedMul) / Math.max(0.1, this.clipRunSpeed));
    }

    private _onTouchStart(e: EventTouch) {
        this._touching = true;
        this._touchX = e.getUILocation().x;
    }

    private _onTouchMove(e: EventTouch) {
        if (!this._touching) return;
        const x = e.getUILocation().x;
        const dx = x - this._touchX;
        if (Math.abs(dx) >= this.swipeThreshold) {
            this.shiftLane(dx > 0 ? 1 : -1);
            this._touchX = x;
        }
    }

    private _onTouchEnd() {
        this._touching = false;
    }

    private _onKey(e: EventKeyboard) {
        if (e.keyCode === KeyCode.ARROW_LEFT || e.keyCode === KeyCode.KEY_A) this.shiftLane(-1);
        else if (e.keyCode === KeyCode.ARROW_RIGHT || e.keyCode === KeyCode.KEY_D) this.shiftLane(1);
    }
}
