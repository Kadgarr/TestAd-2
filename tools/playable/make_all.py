import os, sys, json, zipfile, shutil
sys.path.insert(0, os.path.dirname(__file__))
from build_single import build
SRC=sys.argv[1] if len(sys.argv)>1 else 'build/web-mobile-stage7'; D='dist'; NAME='EgyptianBuilder'
shutil.rmtree(D, ignore_errors=True); os.makedirs(D)
rep={}
for net in ['applovin','unity','liftoff','ironsource','facebook','moloco','google','mintegral','tiktok']:
    d=os.path.join(D,net); os.makedirs(d)
    if net=='mintegral':
        html=os.path.join(d,NAME+'.html'); r=build(SRC,html,net)
        z=os.path.join(d,NAME+'.zip')
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as zf: zf.write(html,f'{NAME}/{NAME}.html')
        os.remove(html); r['zip']=os.path.getsize(z)
    elif net in ('google','tiktok'):
        html=os.path.join(d,'index.html'); r=build(SRC,html,net)
        z=os.path.join(d,f'{NAME}_{net}.zip')
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as zf:
            zf.write(html,'index.html')
            if net=='tiktok': zf.writestr('config.json', json.dumps({"playable_orientation":0}))
        os.remove(html); r['zip']=os.path.getsize(z)
    else:
        html=os.path.join(d,f'{NAME}_{net}.html'); r=build(SRC,html,net)
    rep[net]=r
print(json.dumps(rep,indent=1))
