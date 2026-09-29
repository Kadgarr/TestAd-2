import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Пул декора у обочины (кактусы, камни; второй экземпляр — дома, сфинкс, обелиски, пальмы подальше от трассы). Дочерние узлы раскладываются по обе стороны трассы;
 * ушедшие за камеру переносятся вперёд — ощущение скорости при малом числе объектов.
 */
@ccclass('RoadsideDecor')
export class RoadsideDecor extends Component {
    @property({ type: Node, tooltip: 'Камера: элементы позади неё переносятся вперёд' })
    cameraNode: Node | null = null;

    @property({ tooltip: 'Шаг между элементами по Z, м' })
    spacing = 6;

    @property({ tooltip: 'Z первого элемента' })
    startZ = 8;

    @property({ tooltip: 'Не переносить дальше этой Z (конец трассы)' })
    endZ = -110;

    @property({ tooltip: 'Мин. расстояние от центра трассы, м' })
    minX = 3.3;

    @property({ tooltip: 'Макс. расстояние от центра трассы, м' })
    maxX = 6.5;

    @property scaleMin = 0.8;
    @property scaleMax = 1.3;

    @property({ tooltip: 'Запас за камерой перед переносом, м' })
    behindMargin = 2;

    @property({ tooltip: 'Разворачивать объекты фасадом (+Z модели) к трассе. Выкл. — случайный поворот (кактусы, камни)' })
    faceRoad = false;

    @property({ tooltip: 'Случайное отклонение от направления на трассу, градусы', visible(this: RoadsideDecor) { return this.faceRoad; } })
    yawJitter = 25;

    @property({ tooltip: 'Перемешать порядок объектов при старте, чтобы одинаковые не шли подряд по шаблону' })
    shuffle = false;

    start() {
        if (this.shuffle) {
            const kids = this.node.children.slice();
            for (let i = kids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = kids[i]; kids[i] = kids[j]; kids[j] = tmp;
            }
            kids.forEach((k, i) => k.setSiblingIndex(i));
        }
        const items = this.node.children;
        for (let i = 0; i < items.length; i++) {
            this._place(items[i], i, this.startZ - i * this.spacing);
        }
    }

    update() {
        if (!this.cameraNode) return;
        const camZ = this.cameraNode.worldPosition.z;
        const items = this.node.children;
        const span = items.length * this.spacing;
        for (let i = 0; i < items.length; i++) {
            const n = items[i];
            if (!n.active) continue;
            if (n.worldPosition.z > camZ + this.behindMargin) {
                const z = n.position.z - span;
                if (z < this.endZ) n.active = false;
                else this._place(n, i, z);
            }
        }
    }

    private _place(n: Node, i: number, z: number) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (this.minX + Math.random() * (this.maxX - this.minX));
        const s = this.scaleMin + Math.random() * (this.scaleMax - this.scaleMin);
        n.setPosition(x, 0, z + (Math.random() - 0.5) * this.spacing * 0.5);
        n.setScale(s, s, s);
        const yaw = this.faceRoad
            ? (side < 0 ? 90 : -90) + (Math.random() * 2 - 1) * this.yawJitter
            : Math.random() * 360;
        n.setRotationFromEuler(0, yaw, 0);
    }
}
