#!/usr/bin/env python3
"""Pack a Cocos Creator 3.8 web-mobile build into one self-contained index.html.

usage: build_single.py <build_dir> <out.html> [--network NAME]
"""
import base64, json, os, re, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
INLINE_DIRECT = {'index.html', 'style.css', 'src/polyfills.bundle.js',
                 'src/system.bundle.js', 'src/import-map.json'}
TEXT_EXT = {'.js', '.json', '.css', '.txt'}

# Per-network additions: extra <head> markup and a script run before the game.
NETWORKS = {
    'preview':    {'head': ''},
    'applovin':   {'head': '<script src="mraid.js"></script>'},
    'unity':      {'head': '<script src="mraid.js"></script>'},
    'mraid':      {'head': '<script src="mraid.js"></script>'},
    'ironsource': {'head': ''},       # DAPI injected by the network
    'facebook':   {'head': ''},       # FbPlayableAd injected by the network
    'moloco':     {'head': ''},       # FbPlayableAd-compatible
    'liftoff':    {'head': '<script src="mraid.js"></script>'},
    'google':     {'head': '<meta name="ad.size" content="width=320,height=480">'
                           '<meta name="ad.orientation" content="portrait,landscape">'
                           '<script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>'},
    'mintegral':  {'head': ''},       # window.gameReady/gameEnd/install injected by the network
    'tiktok':     {'head': '<script src="https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'},
}


def js_str(s):
    return json.dumps(s).replace('</', '<\\/')


IOS_PH = 'https://apps.apple.com/app/id0000000000'
AND_PH = 'https://play.google.com/store/apps/details?id=com.example.game'


def build(build_dir, out_path, network='preview', title='Egyptian Builder', ios_url=None, android_url=None):
    files = []
    for root, _, names in os.walk(build_dir):
        for n in names:
            p = os.path.join(root, n)
            rel = os.path.relpath(p, build_dir).replace(os.sep, '/')
            if rel in INLINE_DIRECT:
                continue
            files.append(rel)
    # text first (compresses together), then binaries
    files.sort(key=lambda r: (os.path.splitext(r)[1] not in TEXT_EXT, r))
    blob = bytearray(); manifest = {}
    for rel in files:
        data = open(os.path.join(build_dir, rel), 'rb').read()
        if rel == 'assets/main/index.js':
            if ios_url: data = data.replace(IOS_PH.encode(), ios_url.encode())
            if android_url: data = data.replace(AND_PH.encode(), android_url.encode())
        manifest[rel] = [len(blob), len(data)]
        blob += data
    comp = zlib.compressobj(9, zlib.DEFLATED, -15, 9)
    packed = comp.compress(bytes(blob)) + comp.flush()
    payload = base64.b64encode(packed).decode('ascii')

    rd = lambda r: open(os.path.join(build_dir, r), encoding='utf-8').read()
    inflate = open(os.path.join(HERE, 'inflate.js'), encoding='utf-8').read()
    shim = open(os.path.join(HERE, 'shim.js'), encoding='utf-8').read()
    shim = shim.replace('__TOTAL__', str(len(blob))).replace('__MANIFEST__', json.dumps(manifest, separators=(',', ':')))
    importmap = json.loads(rd('src/import-map.json'))
    importmap['imports'] = {k: re.sub(r'^\./\.\./', './', v) for k, v in importmap['imports'].items()}

    net = NETWORKS[network]
    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1,minimum-scale=1,maximum-scale=1,minimal-ui=true">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">
<meta name="msapplication-tap-highlight" content="no">
{net['head']}
<style>{rd('style.css')}</style>
</head>
<body>
<div id="GameDiv" cc_exact_fit_screen="true"><div id="Cocos3dGameContainer"><canvas id="GameCanvas" oncontextmenu="event.preventDefault()" tabindex="99"></canvas></div></div>
<script>window.__P="{payload}";</script>
<script>{inflate}
{shim}</script>
<script>{rd('src/polyfills.bundle.js')}</script>
<script type="systemjs-importmap">{json.dumps(importmap)}</script>
<script>{rd('src/system.bundle.js')}</script>
<script>(function(){{function go(){{System.import('./index.js').catch(function(e){{console.error(e)}})}}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go()}})();</script>
</body>
</html>
'''
    with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    return {'files': len(files), 'raw': len(blob), 'deflated': len(packed), 'html': os.path.getsize(out_path)}


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = {}
    for flag in ('--network', '--ios', '--android'):
        if flag in a:
            i = a.index(flag); opt[flag[2:]] = a[i + 1]; del a[i:i + 2]
    print(json.dumps(build(a[0], a[1], opt.get('network', 'preview'), ios_url=opt.get('ios'), android_url=opt.get('android'))))
