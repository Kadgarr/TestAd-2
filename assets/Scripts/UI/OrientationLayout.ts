import { _decorator, Component, screen, Size, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Позиция и масштаб узла отдельно для портрета и ландшафта. Применяется компонентом ResponsiveUI.
 * Если позицией управляет Widget — выключите applyPosition.
 */
@ccclass('OrientationLayout')
export class OrientationLayout extends Component {
    @property({ tooltip: 'Менять позицию (выключить, если позицией управляет Widget)' })
    applyPosition = true;

    @property({ group: 'Портрет' }) portraitPosition = new Vec3();
    @property({ group: 'Портрет' }) portraitScale = 1;
    @property({ group: 'Портрет', tooltip: 'Ширина содержимого; если экран уже — масштаб уменьшится (0 = не ужимать)' })
    portraitFitWidth = 0;

    @property({ group: 'Ландшафт' }) landscapePosition = new Vec3();
    @property({ group: 'Ландшафт' }) landscapeScale = 1;
    @property({ group: 'Ландшафт', tooltip: 'Ширина содержимого; если экран уже — масштаб уменьшится (0 = не ужимать)' })
    landscapeFitWidth = 0;

    onEnable() {
        // Узлы, скрытые в момент поворота экрана, получают раскладку при появлении.
        const s = screen.windowSize;
        this.apply(s.width > s.height, view.getVisibleSize());
    }

    apply(landscape: boolean, visible: Size) {
        const pos = landscape ? this.landscapePosition : this.portraitPosition;
        let s = landscape ? this.landscapeScale : this.portraitScale;
        const fit = landscape ? this.landscapeFitWidth : this.portraitFitWidth;
        if (fit > 0) s *= Math.min(1, visible.width / fit);
        if (this.applyPosition) this.node.setPosition(pos);
        this.node.setScale(s, s, 1);
    }
}
