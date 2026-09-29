import { _decorator, Component, director } from 'cc';
const { ccclass, property } = _decorator;

/**
 * В web-бэкенде Cocos 3.8 параметр anisotropy у текстур игнорируется
 * (TEXTURE_MAX_ANISOTROPY никогда не выставляется). Из-за этого грани,
 * видимые под острым углом (боковины кубов), берут мелкий мип и мылятся.
 * Компонент перехватывает установку MIN_FILTER = LINEAR_MIPMAP_LINEAR
 * и добавляет анизотропную фильтрацию. Ставить на объект, который
 * грузится вместе с первой сценой (до первого кадра).
 */
const LINEAR_MIPMAP_LINEAR = 0x2703;
const TEXTURE_MIN_FILTER = 0x2801;
let patched = false;

export function enableAnisotropy(level: number): boolean {
    if (patched) return true;
    const device: any = director.root && (director.root as any).device;
    const gl: any = device && device.gl;
    if (!gl) return false;
    const ext = gl.getExtension('EXT_texture_filter_anisotropic')
        || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
        || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
    if (!ext) { patched = true; return false; }
    const maxA = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
    const aniso = Math.max(1, Math.min(level, maxA));
    const PNAME = ext.TEXTURE_MAX_ANISOTROPY_EXT;

    // WebGL2: параметры живут в sampler-объектах.
    if (typeof gl.samplerParameteri === 'function') {
        const origS = gl.samplerParameteri;
        gl.samplerParameteri = function (s: any, p: number, v: number) {
            origS.call(gl, s, p, v);
            if (p === TEXTURE_MIN_FILTER && v === LINEAR_MIPMAP_LINEAR) gl.samplerParameterf(s, PNAME, aniso);
        };
    }
    // WebGL1: параметры на самой текстуре.
    const origT = gl.texParameteri;
    gl.texParameteri = function (t: number, p: number, v: number) {
        origT.call(gl, t, p, v);
        if (p === TEXTURE_MIN_FILTER && v === LINEAR_MIPMAP_LINEAR) gl.texParameterf(t, PNAME, aniso);
    };
    patched = true;
    return true;
}

@ccclass('AnisotropyFix')
export class AnisotropyFix extends Component {
    @property({ tooltip: 'Уровень анизотропии (1 = выкл). 4 — хороший компромисс для мобилок.' })
    level = 4;

    onLoad() {
        enableAnisotropy(this.level);
    }
}
