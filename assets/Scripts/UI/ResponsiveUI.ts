import { _decorator, Component, ResolutionPolicy, screen, view, Widget } from 'cc';
import { OrientationLayout } from './OrientationLayout';
const { ccclass, property } = _decorator;

/**
 * Адаптивный UI: короткая сторона экрана всегда = shortSide единиц дизайна.
 * Портрет — FIXED_WIDTH, ландшафт — FIXED_HEIGHT. При смене ориентации применяет все OrientationLayout и пересчитывает Widget'ы.
 * Вешается на Canvas.
 */
@ccclass('ResponsiveUI')
export class ResponsiveUI extends Component {
    @property({ tooltip: 'Короткая сторона дизайна, ед.' })
    shortSide = 720;

    @property({ tooltip: 'Длинная сторона дизайна, ед.' })
    longSide = 1280;

    /** true — экран сейчас в ландшафте. */
    landscape = false;

    private _w = -1;
    private _h = -1;

    onLoad() {
        this.refresh();
    }

    update() {
        const s = screen.windowSize;
        if (s.width !== this._w || s.height !== this._h) this.refresh();
    }

    refresh() {
        const s = screen.windowSize;
        this._w = s.width;
        this._h = s.height;
        this.landscape = s.width > s.height;

        if (this.landscape) view.setDesignResolutionSize(this.longSide, this.shortSide, ResolutionPolicy.FIXED_HEIGHT);
        else view.setDesignResolutionSize(this.shortSide, this.longSide, ResolutionPolicy.FIXED_WIDTH);

        const visible = view.getVisibleSize();
        for (const l of this.getComponentsInChildren(OrientationLayout)) l.apply(this.landscape, visible);
        for (const w of this.getComponentsInChildren(Widget)) w.updateAlignment();
    }
}
