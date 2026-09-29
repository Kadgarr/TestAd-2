import { director, game, Game, sys } from 'cc';

/**
 * Единая точка общения с рекламной сетью.
 * Сеть определяется автоматически по глобальным объектам, которые подкладывает её SDK.
 *
 * Использование:
 *   await PlayableSDK.init();      // до старта геймплея
 *   PlayableSDK.gameReady();       // первый кадр показан, можно играть
 *   PlayableSDK.gameEnd();         // показан End Card
 *   PlayableSDK.openStore();       // клик по CTA
 */

export type PlayableNetwork =
    | 'ironsource'   // DAPI
    | 'mraid'        // AppLovin, Unity, Vungle, AdColony, Liftoff и др.
    | 'facebook'
    | 'google'
    | 'mintegral'
    | 'tiktok'       // TikTok / Pangle
    | 'preview';     // браузер, локальный запуск

// TODO: подставить реальные ссылки на страницы игры в сторах.
const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.example.game';
const STORE_URL_IOS = 'https://apps.apple.com/app/id0000000000';

type VisibilityListener = (visible: boolean) => void;

const w = (typeof window !== 'undefined' ? window : {}) as any;

class PlayableSDKImpl {
    private _network: PlayableNetwork = 'preview';
    private _inited = false;
    private _readySent = false;
    private _ended = false;
    private _visible = true;
    private _audioAllowed = true;
    private _listeners: VisibilityListener[] = [];

    get network(): PlayableNetwork { return this._network; }
    get isVisible(): boolean { return this._visible; }
    get isAudioAllowed(): boolean { return this._audioAllowed; }
    get isEnded(): boolean { return this._ended; }

    /** Определяет сеть и ждёт готовности её SDK. */
    init(): Promise<void> {
        if (this._inited) return Promise.resolve();
        this._inited = true;
        this._network = this._detect();

        game.on(Game.EVENT_HIDE, () => this._setVisible(false));
        game.on(Game.EVENT_SHOW, () => this._setVisible(true));

        switch (this._network) {
            case 'ironsource': return this._initDapi();
            case 'mraid': return this._initMraid();
            default: return Promise.resolve();
        }
    }

    /** Сообщить сети, что плейабл загружен и готов к игре. */
    gameReady(): void {
        if (this._readySent) return;
        this._readySent = true;
        if (this._network === 'mintegral' && typeof w.gameReady === 'function') w.gameReady();
    }

    /** Сообщить сети, что сессия закончилась (показан End Card). */
    gameEnd(): void {
        if (this._ended) return;
        this._ended = true;
        if (this._network === 'mintegral' && typeof w.gameEnd === 'function') w.gameEnd();
    }

    /** Переход в стор. Вызывать только из обработчика клика по CTA. */
    openStore(): void {
        const url = this._storeUrl();
        try {
            switch (this._network) {
                case 'ironsource': w.dapi.openStoreUrl(); break;
                case 'mraid': w.mraid.open(url); break;
                case 'facebook': w.FbPlayableAd.onCTAClick(); break;
                case 'google': w.ExitApi.exit(); break;
                case 'mintegral': w.install(); break;
                case 'tiktok':
                    if (w.playableSDK && typeof w.playableSDK.openAppStore === 'function') w.playableSDK.openAppStore();
                    else w.openAppStore();
                    break;
                default: w.open ? w.open(url, '_blank') : null; break;
            }
        } catch (e) {
            console.warn('[PlayableSDK] openStore failed, fallback to window.open', e);
            if (w.open) w.open(url, '_blank');
        }
    }

    /** Подписка на показ/скрытие плейабла (пауза, звук). */
    onVisibilityChange(cb: VisibilityListener): void { this._listeners.push(cb); }

    // ---------------------------------------------------------------------

    private _detect(): PlayableNetwork {
        if (w.dapi) return 'ironsource';
        if (w.mraid) return 'mraid';
        if (w.FbPlayableAd) return 'facebook';
        if (w.ExitApi) return 'google';
        if (typeof w.install === 'function' && typeof w.gameReady === 'function') return 'mintegral';
        if (w.playableSDK || typeof w.openAppStore === 'function') return 'tiktok';
        return 'preview';
    }

    private _storeUrl(): string {
        return sys.os === sys.OS.IOS ? STORE_URL_IOS : STORE_URL_ANDROID;
    }

    private _setVisible(v: boolean): void {
        if (this._visible === v) return;
        this._visible = v;
        if (v) director.resume(); else director.pause();
        for (const cb of this._listeners) cb(v && this._audioAllowed);
    }

    private _initMraid(): Promise<void> {
        const mraid = w.mraid;
        return new Promise(resolve => {
            const onReady = () => {
                mraid.addEventListener('viewableChange', (v: boolean) => this._setVisible(v));
                if (typeof mraid.isViewable === 'function') this._setVisible(!!mraid.isViewable());
                resolve();
            };
            if (mraid.getState && mraid.getState() === 'loading') mraid.addEventListener('ready', onReady);
            else onReady();
        });
    }

    private _initDapi(): Promise<void> {
        const dapi = w.dapi;
        return new Promise(resolve => {
            const onReady = () => {
                dapi.removeEventListener && dapi.removeEventListener('ready', onReady);
                dapi.addEventListener('viewableChange', (e: any) => this._setVisible(!!(e && e.isViewable)));
                dapi.addEventListener('audioVolumeChange', (vol: number) => {
                    this._audioAllowed = vol > 0;
                    for (const cb of this._listeners) cb(this._visible && this._audioAllowed);
                });
                this._audioAllowed = (dapi.getAudioVolume ? dapi.getAudioVolume() : 1) > 0;
                this._setVisible(dapi.isViewable ? !!dapi.isViewable() : true);
                resolve();
            };
            if (dapi.isReady && dapi.isReady()) onReady();
            else dapi.addEventListener('ready', onReady);
        });
    }
}

export const PlayableSDK = new PlayableSDKImpl();
