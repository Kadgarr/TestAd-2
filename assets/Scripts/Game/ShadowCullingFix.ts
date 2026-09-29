import { _decorator, Component, MeshRenderer, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

const _min = new Vec3();
const _max = new Vec3();

/**
 * Расширяет границы видимости всех мешей в поддереве, чтобы объект не отсекался камерой,
 * пока в кадре ещё видна его Planar-тень. Иначе тень исчезает вместе с мешем у края экрана.
 * Вешается на корневой узел группы (декор, ловушки, блоки).
 */
@ccclass('ShadowCullingFix')
export class ShadowCullingFix extends Component {
    @property({ tooltip: 'Запас границ видимости во все стороны, м. Должен быть не меньше длины тени самого высокого объекта.' })
    margin = 2;

    start() {
        // Кадром позже — после того как другие компоненты (RoadsideDecor) расставят и отмасштабируют объекты.
        this.scheduleOnce(() => this.apply(), 0);
    }

    apply() {
        for (const mr of this.getComponentsInChildren(MeshRenderer)) {
            const mesh = mr.mesh;
            const model = mr.model as any;
            if (!mesh || !model || !model.createBoundingShape) continue;
            const st = mesh.struct;
            if (!st.minPosition || !st.maxPosition) continue;
            // Запас задан в мировых метрах, а границы — в локальных координатах меша: делим на масштаб.
            const s = mr.node.worldScale;
            const mx = this.margin / Math.max(1e-4, Math.abs(s.x));
            const my = this.margin / Math.max(1e-4, Math.abs(s.y));
            const mz = this.margin / Math.max(1e-4, Math.abs(s.z));
            _min.set(st.minPosition.x - mx, st.minPosition.y - my, st.minPosition.z - mz);
            _max.set(st.maxPosition.x + mx, st.maxPosition.y + my, st.maxPosition.z + mz);
            model.createBoundingShape(_min, _max);
            if (model.updateWorldBound) model.updateWorldBound();
        }
    }
}
