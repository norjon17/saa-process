"""Re-implementation of the 'First Mean Check' Excel template judgment from the 3 raw CSVs."""
import csv, glob, os, statistics as st, sys

SPECS = {  # model: (pitch_target, roll_target, tol, d_sat, d_target, sigma, cpk)  -- Summary!L80:T95
 'J1B':(1.8,0,.4,.05,.05,.08,1.33),'J1R':(1.8,0,.4,.05,.05,.08,1.33),'JGO':(1.8,0,.4,.05,.05,.08,1.33),
 'JGB':(1.8,0,.4,.05,.05,.08,1.33),'MPK':(2.0,0,.4,.05,.05,.08,1.33),'SF4':(1.9,0,.4,.05,.05,.08,1.33),
 'CEP':(1.7,0,.65,.05,.05,.08,1.33),'A8S':(2.0,0,.4,.05,.05,.08,1.33),'APS':(2.0,0,.4,.05,.05,.08,1.33),
 'PCM':(1.9,0,.4,.05,.05,.08,1.33),'PDQ':(1.9,0,.4,.05,.05,.08,1.33),'LDS':(1.9,0,.4,.05,.05,.08,1.33),
 'SEW':(1.9,0,.4,.05,.05,.08,1.33),'LD3':(1.9,0,.4,.05,.05,.08,1.33),'KCF':(1.75,0,.25,.05,.05,.08,1.33)}
LEFT = list(range(1,11))+list(range(21,31)); RIGHT = list(range(11,21))+list(range(31,41))
DELTA_LIMIT = 0.15

def read_mcds(path):
    rows=[l.rstrip('\n') for l in open(path,encoding='latin-1')]
    split=lambda l:[x.strip() for x in l.split(',')]
    h1,v1=split(rows[0]),split(rows[1]); meta=dict(zip(h1,v1))
    hdr=split(rows[2]); out={}
    for l in rows[3:]:
        if not l.strip(): continue
        d=dict(zip(hdr,split(l)))
        out[int(d['TrayPosition'])]=dict(fix='L' if d['FixtureNo']=='1' else 'R',
            psa_b=float(d['PSA_Before']),rsa_b=float(d['RSA_Before']),psa_a=float(d['PSA_After']),rsa_a=float(d['RSA_After']),state=d.get('ResultState'))
    return meta,out
def read_remeasure(path):
    return {int(r['HGA']):(float(r['PSA']),float(r['RSA'])) for r in csv.DictReader(open(path)) if r.get('HGA')}
def read_sat(path):
    out={}
    for r in csv.reader(open(path)):
        if len(r)>6 and r[1].strip(): out[int(r[1])]=(float(r[4]),float(r[5])); sat_id=r[13]
    return out,sat_id

def judge(mcds,rem,sat):
    meta,saa=read_mcds(mcds); rm=read_remeasure(rem); sd,sat_id=read_sat(sat)
    model=meta['Product']; tp,tr,tol,s_dsat,s_dtgt,s_sig,s_cpk=SPECS[model]
    grp={'Left':LEFT,'Right':RIGHT,'Overall':LEFT+RIGHT}
    res={'lot':meta['PenNo'],'tester':list(saa.values()) and os.path.basename(mcds),'model':model,'sat':sat_id,'checks':[]}
    fail=lambda ok:'Passed' if ok else 'Failed'
    checks=res['checks']; allpass=True
    for g,pos in grp.items():
        dP=[rm[p][0]-sd[p][0] for p in pos]; dR=[rm[p][1]-sd[p][1] for p in pos]
        checks.append((f'Fixture delta {g} Pitch min/max',round(min(dP),3),round(max(dP),3),fail(abs(min(dP))<=DELTA_LIMIT and abs(max(dP))<=DELTA_LIMIT)))
        checks.append((f'Fixture delta {g} Roll  min/max',round(min(dR),3),round(max(dR),3),fail(abs(min(dR))<=DELTA_LIMIT and abs(max(dR))<=DELTA_LIMIT)))
    for g,pos in grp.items():
        for ax,i,tgt in (('Pitch',0,tp),('Roll',1,tr)):
            rmm=st.mean(rm[p][i] for p in pos); s=[sd[p][i] for p in pos]; sm=st.mean(s); ss=st.stdev(s)
            cpk=min((tgt+tol-sm)/(3*ss),(sm-(tgt-tol))/(3*ss))
            items=[('ReMeasure-SAT',rmm-sm,abs(rmm-sm)<=s_dsat),('SAT-Target',sm-tgt,abs(sm-tgt)<=s_dtgt),('SAT sigma',ss,ss<=s_sig),('SAT Cpk',cpk,cpk>=s_cpk)]
            for name,val,ok in items:
                allpass&=ok; checks.append((f'{g:7} {ax:5} {name}',round(val,4),'',fail(ok)))
    res['overall']=fail(allpass); return res

if __name__=='__main__':
    for d in sys.argv[1:]:
        mc=glob.glob(os.path.join(d,'*-MC-DS.csv'))[0]
        sat=[f for f in glob.glob(os.path.join(d,'*.csv')) if f.count('_')>=2 and '-MC-' not in f][0]
        rem=[f for f in glob.glob(os.path.join(d,'*.csv')) if f not in (mc,sat)][0]
        r=judge(mc,rem,sat); print('='*70); print(d, '| lot',r['lot'],'| model',r['model'],'| SAT',r['sat'],'| OVERALL:',r['overall'])
        for c in r['checks']: print('   ',c)
