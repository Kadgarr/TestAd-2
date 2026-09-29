import { _decorator, AudioClip, AudioSource, Component, EventTouch, input, Input, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { PlayableSDK } from '../Core/PlayableSDK';
import { gameEvents, GameEvent } from './GameConfig';
const { ccclass, property } = _decorator;

/**
 * Звук: музыкальный луп и эффекты. Всё включается только после первого касания (политика autoplay),
 * глушится, когда плейабл скрыт или сеть запретила звук.
 * Подбор блока — ноты по возрастанию (каждый следующий блок звучит выше).
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: AudioClip }) music: AudioClip | null = null;
    @property({ type: [AudioClip], tooltip: 'Ноты подбора по возрастанию; после последней повторяется последняя' })
    pickup: AudioClip[] = [];
    @property({ type: AudioClip }) hit: AudioClip | null = null;
    @property({ type: AudioClip }) place: AudioClip | null = null;
    @property({ type: AudioClip }) win: AudioClip | null = null;
    @property({ type: AudioClip }) fail: AudioClip | null = null;
    @property({ type: AudioClip }) whoosh: AudioClip | null = null;

    @property({ range: [0, 1, 0.05], slide: true }) musicVolume = 0.45;
    @property({ range: [0, 1, 0.05], slide: true }) sfxVolume = 0.9;
    @property({ range: [0, 1, 0.05], slide: true, tooltip: 'Громкость музыки во время финала' }) musicDuck = 0.2;

    @property({ type: Node, tooltip: 'Кнопка звука (вкл/выкл)' }) muteButton: Node | null = null;
    @property({ type: SpriteFrame, tooltip: 'Иконка «звук включён»' }) iconSoundOn: SpriteFrame | null = null;
    @property({ type: SpriteFrame, tooltip: 'Иконка «звук выключен»' }) iconSoundOff: SpriteFrame | null = null;

    private _muted = false;
    private _music: AudioSource | null = null;
    private _sfx: AudioSource | null = null;
    private _unlocked = false;
    private _audible = true;
    private _pickIdx = 0;

    onLoad() {
        this._music = this.node.addComponent(AudioSource);
        this._music.loop = true;
        this._music.playOnAwake = false;
        this._music.clip = this.music;
        this._music.volume = this.musicVolume;
        this._sfx = this.node.addComponent(AudioSource);
        this._sfx.playOnAwake = false;

        input.on(Input.EventType.TOUCH_START, this._unlock, this);
        input.on(Input.EventType.KEY_DOWN, this._unlock, this);
        PlayableSDK.onVisibilityChange((audible) => this._setAudible(audible));

        this.muteButton?.on(Node.EventType.TOUCH_END, this._onMuteTap, this);
        this._refreshIcon();

        gameEvents.on(GameEvent.STACK_CHANGED, this._onStack, this);
        gameEvents.on(GameEvent.PLAYER_HIT, this._onHit, this);
        gameEvents.on(GameEvent.BLOCK_PLACED, this._onPlaced, this);
        gameEvents.on(GameEvent.RESULT, this._onResult, this);
        gameEvents.on(GameEvent.LANE_CHANGED, this._onLane, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this._unlock, this);
        input.off(Input.EventType.KEY_DOWN, this._unlock, this);
        gameEvents.off(GameEvent.STACK_CHANGED, this._onStack, this);
        gameEvents.off(GameEvent.PLAYER_HIT, this._onHit, this);
        gameEvents.off(GameEvent.BLOCK_PLACED, this._onPlaced, this);
        gameEvents.off(GameEvent.RESULT, this._onResult, this);
        gameEvents.off(GameEvent.LANE_CHANGED, this._onLane, this);
    }

    get muted() { return this._muted; }

    /** Вкл/выкл весь звук (музыка + эффекты). */
    toggleMute() {
        this._muted = !this._muted;
        this._refreshIcon();
        if (!this._music) return;
        if (this._muted) this._music.pause();
        else if (this._unlocked && this._audible) this._music.play();
    }

    private _onMuteTap(e: EventTouch) {
        e.propagationStopped = true;
        // Нажатие — тоже жест пользователя: можно разблокировать звук.
        this.toggleMute();
        if (!this._muted) this._unlock();
        const b = this.muteButton!;
        b.setScale(1, 1, 1);
        tween(b).to(0.07, { scale: new Vec3(0.88, 0.88, 1) }).to(0.12, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private _refreshIcon() {
        const sp = this.muteButton?.getComponent(Sprite);
        if (!sp) return;
        const f = this._muted ? this.iconSoundOff : this.iconSoundOn;
        if (f) sp.spriteFrame = f;
    }

    private _unlock() {
        if (this._unlocked) return;
        this._unlocked = true;
        input.off(Input.EventType.TOUCH_START, this._unlock, this);
        input.off(Input.EventType.KEY_DOWN, this._unlock, this);
        if (this._audible && !this._muted && this._music && this.music) this._music.play();
    }

    private _setAudible(v: boolean) {
        this._audible = v;
        if (!this._music || !this._unlocked) return;
        if (v && !this._muted) this._music.play(); else this._music.pause();
    }

    private _play(clip: AudioClip | null, vol = 1) {
        if (!clip || !this._sfx || !this._unlocked || !this._audible || this._muted) return;
        this._sfx.playOneShot(clip, this.sfxVolume * vol);
    }

    private _onStack(count: number, delta: number) {
        if (delta > 0) {
            const clip = this.pickup.length ? this.pickup[Math.min(this._pickIdx, this.pickup.length - 1)] : null;
            this._pickIdx++;
            this._play(clip, 0.8);
        } else if (delta < 0) {
            // После удара нота подбора откатывается назад вместе со стопкой.
            this._pickIdx = Math.max(0, Math.min(this._pickIdx, count));
        }
    }

    private _onHit() { this._play(this.hit, 1); }
    private _onPlaced() { this._play(this.place, 0.8); }
    private _onLane() { this._play(this.whoosh, 0.35); }

    private _onResult(win: boolean) {
        if (this._music) this._music.volume = this.musicVolume * this.musicDuck;
        this._play(win ? this.win : this.fail, 1);
        this.scheduleOnce(() => { if (this._music) this._music.volume = this.musicVolume * 0.7; }, win ? 2.2 : 1.2);
    }
}
