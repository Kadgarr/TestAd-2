import { _decorator, Component, Input, input, Node } from 'cc';
import { PlayableSDK } from '../Core/PlayableSDK';
import { CameraFollow } from './CameraFollow';
import { Collectible } from './Collectible';
import { FinishSequence } from './FinishSequence';
import { gameEvents, GameEvent, GameState, MIN_BLOCKS_TO_WIN } from './GameConfig';
import { Obstacle } from './Obstacle';
import { PlayerController } from './PlayerController';
import { StackController } from './StackController';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

/** Машина состояний: Tutorial → Run → Finish → Result → EndCard. Проверка столкновений без физики. */
@ccclass('GameManager')
export class GameManager extends Component {
    @property({ type: PlayerController }) player: PlayerController | null = null;
    @property({ type: StackController }) stack: StackController | null = null;
    @property({ type: CameraFollow }) cameraFollow: CameraFollow | null = null;
    @property({ type: FinishSequence }) finish: FinishSequence | null = null;
    @property({ type: UIManager }) ui: UIManager | null = null;

    @property({ type: Node, tooltip: 'Линия финиша: при пересечении начинается постройка' })
    finishLine: Node | null = null;

    @property({ tooltip: 'Сколько блоков нужно донести до финиша для победы. Отметка на шкале прогресса ставится автоматически', min: 1, step: 1 })
    blocksToWin = MIN_BLOCKS_TO_WIN;

    @property({ tooltip: 'Бездействие на туториале до показа End Card, с' })
    idleTimeout = 10;

    @property({ tooltip: 'Пауза между надписью результата и End Card, с' })
    resultToEndCard = 1.6;

    @property({ tooltip: 'Длительность переезда камеры на финише, с' })
    finishCameraDuration = 1.0;

    @property({ tooltip: 'Половина ширины игрока для ударов, м' })
    playerHalfWidth = 0.35;

    @property({ tooltip: 'Половина глубины игрока для ударов, м' })
    playerHalfDepth = 0.3;

    state: GameState = GameState.Tutorial;

    private _idle = 0;

    onLoad() {
        PlayableSDK.init().then(() => PlayableSDK.gameReady());
    }

    start() {
        this.ui?.setWinThreshold(this.blocksToWin);
        this.ui?.showTutorial();
        input.on(Input.EventType.TOUCH_START, this._onFirstInput, this);
        input.on(Input.EventType.KEY_DOWN, this._onFirstInput, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this._onFirstInput, this);
        input.off(Input.EventType.KEY_DOWN, this._onFirstInput, this);
    }

    update(dt: number) {
        switch (this.state) {
            case GameState.Tutorial:
                this._idle += dt;
                if (this._idle >= this.idleTimeout) this._showEndCard(false);
                break;
            case GameState.Run:
                this._checkCollisions();
                this._checkFinish();
                break;
        }
    }

    private _setState(s: GameState) {
        this.state = s;
        gameEvents.emit(GameEvent.STATE_CHANGED, s);
    }

    private _onFirstInput() {
        if (this.state !== GameState.Tutorial) return;
        input.off(Input.EventType.TOUCH_START, this._onFirstInput, this);
        input.off(Input.EventType.KEY_DOWN, this._onFirstInput, this);
        this.ui?.hideTutorial();
        this._setState(GameState.Run);
        this.player?.startRun();
    }

    private _checkCollisions() {
        if (!this.player || !this.stack) return;
        const p = this.player.node.worldPosition;

        const cs = Collectible.all.slice();
        for (const c of cs) {
            if (c.collected) continue;
            const cp = c.node.worldPosition;
            if (Math.abs(cp.x - p.x) < c.pickRadius && Math.abs(cp.z - p.z) < c.pickRadius) {
                c.markCollected();
                this.stack.add(c.node);
            }
        }

        for (const o of Obstacle.all) {
            if (o.hit) continue;
            const op = o.node.worldPosition;
            if (Math.abs(op.x - p.x) < o.halfWidth + this.playerHalfWidth &&
                Math.abs(op.z - p.z) < o.halfDepth + this.playerHalfDepth) {
                o.onHit();
                this.stack.knock(o.knockCount);
                this.player.stumble();
                gameEvents.emit(GameEvent.PLAYER_HIT);
            }
        }
    }

    private _checkFinish() {
        if (!this.player || !this.finishLine) return;
        if (this.player.node.worldPosition.z > this.finishLine.worldPosition.z) return;

        this._setState(GameState.Finish);
        this.player.stop();
        if (this.finish && this.finish.cameraPoint && this.cameraFollow) {
            this.cameraFollow.moveTo(this.finish.cameraPoint, this.finishCameraDuration);
        }
        const delay = this.finish ? this.finish.startDelay : 0.5;
        this.scheduleOnce(() => {
            if (this.finish && this.stack) this.finish.play(this.stack, this.blocksToWin, (win) => this._onResult(win));
            else this._onResult(false);
        }, delay);
    }

    private _onResult(win: boolean) {
        this._setState(GameState.Result);
        this.ui?.showResult(win);
        this.player?.celebrate(win);
        gameEvents.emit(GameEvent.RESULT, win);
        this.scheduleOnce(() => this._showEndCard(win), this.resultToEndCard);
    }

    private _showEndCard(win: boolean) {
        if (this.state === GameState.EndCard) return;
        this._setState(GameState.EndCard);
        this.player?.stop();
        this.ui?.showEndCard(win);
        PlayableSDK.gameEnd();
    }
}
