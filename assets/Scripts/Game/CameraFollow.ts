import { _decorator, Component, Node, Quat, tween, Vec3 } from 'cc';
import { StackController } from './StackController';
const { ccclass, property } = _decorator;

const _pos = new Vec3();
const _q = new Quat();

/**
 * Камера следует за игроком, сохраняя ракурс, выставленный в инспекторе.
 * Position и Rotation узла камеры в сцене задают стартовый вид относительно игрока в точке старта:
 * скрипт запоминает смещение и поворот и не меняет поворот во время бега.
 * При росте стопки камера отъезжает назад вдоль своей оси взгляда и поднимается. На финише — переезд в точку-якорь.
 */
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: 'Игрок' })
    target: Node | null = null;

    @property({ type: StackController })
    stack: StackController | null = null;

    @property({ tooltip: 'Отъезд камеры назад вдоль её оси взгляда на каждый блок, м' })
    perBlockDistance = 0.45;

    @property({ tooltip: 'Подъём камеры на каждый блок, м' })
    perBlockHeight = 0.3;

    @property({ tooltip: 'После скольких блоков камера перестаёт отъезжать' })
    maxBlocksForZoom = 14;

    @property({ tooltip: 'Доля смещения игрока по X, которую повторяет камера (0 = не двигается вбок, 1 = полностью)' })
    followX = 0.5;

    @property({ tooltip: 'Плавность по X/Y' })
    smooth = 6;

    @property({ tooltip: 'Плавность изменения зума' })
    zoomSmooth = 3;

    private _fixed = false;
    private _zoom = 0;
    private _offset = new Vec3();
    private _rot = new Quat();
    private _back = new Vec3();
    private _base = new Vec3();
    private _shakeT = 0;
    private _shakeDur = 0;
    private _shakeAmp = 0;

    onLoad() {
        // Запоминаем ракурс из сцены (Position/Rotation в инспекторе).
        this._rot.set(this.node.worldRotation);
        Vec3.transformQuat(this._back, Vec3.FORWARD, this._rot);
        this._back.negative();
        if (this.target) {
            const tp = this.target.worldPosition;
            const cp = this.node.worldPosition;
            this._offset.set(cp.x - tp.x * this.followX, cp.y - tp.y, cp.z - tp.z);
        }
        this._base.set(this.node.worldPosition);
    }

    /** Мгновенно поставить камеру в расчётную точку (без сглаживания). */
    snap() {
        if (!this.target) return;
        this._zoom = this._blocks();
        this._desired(_pos);
        this.node.setWorldPosition(_pos);
        this._base.set(_pos);
        this.node.setWorldRotation(this._rot);
    }

    /** Короткая тряска камеры (удар). amount — амплитуда, м. */
    shake(amount = 0.15, duration = 0.25) {
        this._shakeAmp = amount;
        this._shakeDur = duration;
        this._shakeT = duration;
    }

    /** Переезд в трансформ узла-якоря (позиция + поворот). */
    moveTo(anchor: Node, duration: number) {
        this._fixed = true;
        const fromP = this.node.worldPosition.clone();
        const fromR = this.node.worldRotation.clone();
        const toP = anchor.worldPosition.clone();
        const toR = anchor.worldRotation.clone();
        const s = { t: 0 };
        tween(s).to(duration, { t: 1 }, {
            easing: 'sineInOut',
            onUpdate: () => {
                Vec3.lerp(_pos, fromP, toP, s.t);
                Quat.slerp(_q, fromR, toR, s.t);
                this.node.setWorldPosition(_pos);
                this.node.setWorldRotation(_q);
            },
        }).start();
    }

    lateUpdate(dt: number) {
        if (this._fixed || !this.target) return;
        this._zoom += (this._blocks() - this._zoom) * Math.min(1, dt * this.zoomSmooth);
        this._desired(_pos);
        const cur = this._base;
        const k = Math.min(1, dt * this.smooth);
        _pos.x = cur.x + (_pos.x - cur.x) * k;
        _pos.y = cur.y + (_pos.y - cur.y) * k;
        // По Z без сглаживания, чтобы камера не отставала от бегущего игрока.
        this._base.set(_pos);
        if (this._shakeT > 0) {
            this._shakeT -= dt;
            const a = this._shakeAmp * Math.max(0, this._shakeT / this._shakeDur);
            _pos.x += (Math.random() * 2 - 1) * a;
            _pos.y += (Math.random() * 2 - 1) * a;
        }
        this.node.setWorldPosition(_pos);
    }

    private _blocks() {
        return Math.min(this.stack ? this.stack.count : 0, this.maxBlocksForZoom);
    }

    private _desired(out: Vec3) {
        const tp = this.target!.worldPosition;
        const d = this.perBlockDistance * this._zoom;
        const h = this.perBlockHeight * this._zoom;
        out.set(
            tp.x * this.followX + this._offset.x + this._back.x * d,
            tp.y + this._offset.y + this._back.y * d + h,
            tp.z + this._offset.z + this._back.z * d,
        );
    }
}
