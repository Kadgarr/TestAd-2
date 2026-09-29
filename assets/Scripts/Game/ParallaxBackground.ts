import { _decorator, CCFloat, Component, Enum, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum BackgroundMode {
    Layers = 0,
    Panorama = 1,
}
Enum(BackgroundMode);

/**
 * Фон: небо-градиент + карточки на большом расстоянии перед камерой.
 * Карточки всегда едут вместе с камерой по Z (поэтому всегда за игровой пирамидой),
 * а по X смещаются с разной долей — это даёт параллакс при смене линии.
 *
 * Режим Layers — три PNG-слоя с альфой (дальний / средний / ближний).
 * Режим Panorama — запасной вариант: одна JPG-карточка со всеми слоями.
 * Перед финальной сборкой ненужный вариант удаляется со сцены, чтобы его текстура не попала в билд.
 */
@ccclass('ParallaxBackground')
export class ParallaxBackground extends Component {
    @property({ type: Node, tooltip: 'Камера, за которой едет фон' })
    cameraNode: Node | null = null;

    @property({ type: Enum(BackgroundMode), tooltip: 'Layers — слои с параллаксом; Panorama — одна JPG-панорама' })
    mode: BackgroundMode = BackgroundMode.Layers;

    @property({ type: Node, tooltip: 'Градиент неба (общий для обоих режимов)' })
    sky: Node | null = null;

    @property({ tooltip: 'Расстояние до неба, м (меньше far камеры)' })
    skyDistance = 295;

    @property({ type: [Node], tooltip: 'Слои от дальнего к ближнему' })
    layers: Node[] = [];

    @property({ type: [CCFloat], tooltip: 'Расстояние до каждого слоя, м' })
    layerDistances: number[] = [270, 250, 230];

    @property({ type: [CCFloat], tooltip: 'Сила параллакса по X: 0 — слой неподвижен на экране, больше — сильнее сдвигается при смене линии' })
    layerParallax: number[] = [0.4, 1.0, 2.0];

    @property({ type: Node, tooltip: 'Запасная JPG-панорама' })
    panorama: Node | null = null;

    @property({ tooltip: 'Расстояние до панорамы, м' })
    panoramaDistance = 260;

    @property({ tooltip: 'Сдвиг центра фона по X относительно камеры, м (камера смотрит чуть влево)' })
    xOffset = -70;

    @property({ tooltip: 'Высота линии горизонта слоёв, м' })
    groundY = 0;

    onLoad() {
        this.applyMode();
    }

    applyMode() {
        const layersOn = this.mode === BackgroundMode.Layers;
        for (const l of this.layers) if (l) l.active = layersOn;
        if (this.panorama) this.panorama.active = !layersOn;
        this.lateUpdate();
    }

    lateUpdate() {
        if (!this.cameraNode) return;
        const c = this.cameraNode.worldPosition;
        if (this.sky) this.sky.setWorldPosition(c.x + this.xOffset, this.groundY, c.z - this.skyDistance);
        if (this.mode === BackgroundMode.Layers) {
            for (let i = 0; i < this.layers.length; i++) {
                const l = this.layers[i];
                if (!l) continue;
                const d = this.layerDistances[i] ?? 250;
                const p = this.layerParallax[i] ?? 0;
                l.setWorldPosition(c.x * (1 - p) + this.xOffset, this.groundY, c.z - d);
            }
        } else if (this.panorama) {
            this.panorama.setWorldPosition(c.x + this.xOffset, this.groundY, c.z - this.panoramaDistance);
        }
    }
}
