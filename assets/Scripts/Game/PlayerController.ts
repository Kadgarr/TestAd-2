import { _decorator, Component, EventKeyboard, EventTouch, Input, input, KeyCode, Node } from 'cc';
import { LANES } from './GameConfig';
const { ccclass, property } = _decorator;

/**
 * Бег вперёд по -Z и перестроение между линиями свайпом / drag (или стрелками / A-D на ПК).
 * Анимация бега в грейбоксе — кодом (покачивание, конечности). Позже заменится скелетной.
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

    @property({ type: Node, tooltip: 'Визуальная модель: наклоны и покачивание' })
    visual: Node | null = null;

    @property({ type: Node }) armL: Node | null = null;
    @property({ type: Node }) armR: Node | null = null;
    @property({ type: Node }) legL: Node | null = null;
    @property({ type: Node }) legR: Node | null = null;

    lane = 1;
    running = false;
    inputEnabled = false;
    /** Боковая скорость, м/с — для инерции стопки. */
    lateralVelocity = 0;

    private _speedMul = 1;
    private _touchX = 0;
    private _touching = false;
    private _t = 0;
    private _carry = false;
    private _armAngle = 0;

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

    startRun() {
        this.running = true;
        this.inputEnabled = true;
    }

    stop() {
        this.running = false;
        this.inputEnabled = false;
    }

    setCarry(carry: boolean) {
        this._carry = carry;
    }

    stumble() {
        this._speedMul = this.hitSlowdown;
    }

    shiftLane(dir: number) {
        if (!this.inputEnabled) return;
        this.lane = Math.max(0, Math.min(LANES.length - 1, this.lane + dir));
    }

    update(dt: number) {
        this._t += dt;
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

        this._animate(dt);
    }

    private _animate(dt: number) {
        const phase = this._t * 12;
        const s = this.running ? Math.sin(phase) : 0;

        if (this.visual) {
            const bob = this.running ? Math.abs(Math.sin(phase)) * 0.08 : 0;
            const roll = Math.max(-15, Math.min(15, -this.lateralVelocity * 2.5));
            this.visual.setPosition(0, bob, 0);
            this.visual.setRotationFromEuler(this.running ? -6 : 0, 0, roll);
        }

        if (this.legL) this.legL.setRotationFromEuler(s * 35, 0, 0);
        if (this.legR) this.legR.setRotationFromEuler(-s * 35, 0, 0);

        // Руки: при переноске вытянуты вперёд (+80° вокруг X), иначе машут.
        const target = this._carry ? 80 : 0;
        this._armAngle += (target - this._armAngle) * Math.min(1, dt * 10);
        const swing = this._carry ? s * 4 : s * 35;
        if (this.armL) this.armL.setRotationFromEuler(this._armAngle - swing, 0, 0);
        if (this.armR) this.armR.setRotationFromEuler(this._armAngle + swing, 0, 0);
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
