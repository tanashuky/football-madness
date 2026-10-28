import json, math, sys
from collections import defaultdict
D=sys.argv[1]
rows=json.load(open(D+'/b1.json'))+json.load(open(D+'/b2.json'))
def pois(l,k): return math.exp(-l)*l**k/math.factorial(k)
def target(r):
    la=min(4,max(0.2,1.25*r**2.5)); lb=min(4,max(0.2,1.25/r**2.5))
    w=d=l=0
    for i in range(12):
        for j in range(12):
            p=pois(la,i)*pois(lb,j)
            if i>j: w+=p
            elif i==j: d+=p
            else: l+=p
    return w*100,d*100,l*100
by=defaultdict(list)
for x in rows: by[x['r']].append(x)
print("oran   N    G/B/M (motor)        G/B/M (hedef)      gol/mac  guclu-zayif gol")
out=[]
for r in sorted(by):
    xs=by[r]; n=len(xs)
    w=sum(1 for x in xs if x['gs']>x['gw'])/n*100; d=sum(1 for x in xs if x['gs']==x['gw'])/n*100; l=100-w-d
    tw,td,tl=target(r)
    g=sum(x['gs']+x['gw'] for x in xs)/n
    print(f"{r:<5} {n:<4} {w:5.1f}/{d:5.1f}/{l:5.1f}   {tw:5.1f}/{td:5.1f}/{tl:5.1f}    {g:4.2f}   {sum(x['gs'] for x in xs)/n:.2f}-{sum(x['gw'] for x in xs)/n:.2f}")
    out.append(dict(r=r,n=n,w=w,d=d,l=l,tw=tw,td=td,tl=tl,g=g,gs=sum(x['gs'] for x in xs)/n,gw=sum(x['gw'] for x in xs)/n))
eq=by[1.0]; n=len(eq)
tot=[x['gs']+x['gw'] for x in eq]
dist=defaultdict(int)
for t in tot: dist[t]+=1
print("esit maclar gol dagilimi:", ' '.join(f"{k}:{100*v/n:.1f}%" for k,v in sorted(dist.items())))
print(f"golsuz %{100*dist[0]/n:.1f}  5+ gol %{100*sum(v for k,v in dist.items() if k>=5)/n:.1f}  7+ gol %{100*sum(v for k,v in dist.items() if k>=7)/n:.1f}")
m=lambda k: sum(x[k] for x in eq)/n/2
print(f"takim basi (esit): sut {m('sh'):.1f} isabetli {m('ot'):.1f} xG {m('xg'):.2f} pas {m('pas'):.0f} pas% {100*sum(x['pok'] for x in eq)/sum(x['pas'] for x in eq):.1f} faul {m('fo'):.1f} sari {m('ye'):.2f} kirmizi {m('re'):.2f} korner {m('co'):.1f} duran top gol payi %{100*sum(x['sp'] for x in eq)/max(1,sum(x['gs']+x['gw'] for x in eq)):.0f}")
json.dump(dict(curve=out,dist=dict(dist),n_eq=n,team=dict(shots=m('sh'),ot=m('ot'),xg=m('xg'),passes=m('pas'),passpct=100*sum(x['pok'] for x in eq)/sum(x['pas'] for x in eq),fouls=m('fo'),yel=m('ye'),red=m('re'),corners=m('co'),offsides=m('of'),sp=100*sum(x['sp'] for x in eq)/max(1,sum(x['gs']+x['gw'] for x in eq)))),open(D+'/summary.json','w'))
