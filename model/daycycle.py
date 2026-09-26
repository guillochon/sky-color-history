import json, numpy as np, sys
sys.path.insert(0,'/home/claude')
from skymodel import *
src = open('/home/claude/run_epochs.py').read().split('LATS =')[0]
ns = {}; exec(src, ns); EPOCHS = ns['EPOCHS']
SZAS = [0,10,20,30,40,50,60,70,75,80,84,87,89,90,91,92,93,94,96,98,100]
VZ = [0,15,30,45,60,70,78,84,88]
AZ = [0,20,40,60,80,100,120,140,160,180]
ALB = {'Equator':0.08,'Mid-latitude':0.18,'Polar':0.70}
def build(e, albedo):
    T, L = e['sun']
    return make_atm(e['gas'], ozone_DU=e['ozone'], trop_aer=e['aer'], strat_sulf=e.get('sulf',0),
                    haze550=e.get('haze',0), soot=e.get('soot',0), dust=e.get('dust',0),
                    albedo=e.get('albedo', albedo), sun_T=T, sun_L=L)
out = {'szas':SZAS,'vz':VZ,'az':AZ,'epochs':{}}
for e in EPOCHS[9:]:
    rec = {}
    for lname, alb in ALB.items():
        atm = build(e, alb)
        dome = []; sun = []
        for sz in SZAS:
            grid = []
            for vz in VZ:
                row = []
                for az in AZ:
                    X = spec_to_XYZ(atm.radiance(vz, az, sz))
                    s = X.sum(); row.append([round(X[0]/s,4) if s>0 else 0.33, round(X[1]/s,4) if s>0 else 0.33, float('%.3g'%X[1])])
                grid.append(row)
            dome.append(grid)
            S = spec_to_XYZ(atm.direct_sun(min(sz,89.7))) if sz < 90 else np.zeros(3)
            s = S.sum(); sun.append([round(S[0]/s,4) if s>0 else 0.33, round(S[1]/s,4) if s>0 else 0.33, float('%.3g'%S[1])])
        rec[lname] = {'dome':dome,'sun':sun}
    out['epochs'][e['key']] = rec
    print(e['key'], flush=True)
json.dump(out, open('/home/claude/dc3.json','w'), separators=(',',':'))
print('done')
