# Genera src/data/tests-history.json a partir de nuclear_explosions.csv (SIPRI/FOA vía TidyTuesday 2019-08-20):
# https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2019/2019-08-20/nuclear_explosions.csv
# Uso: descargar el CSV en la raíz del proyecto y ejecutar  python3 scripts/tests-history.py
import csv, json, datetime, re
def num(v):
    try: return float(v)
    except: return 0.0
rows=list(csv.DictReader(open('nuclear_explosions.csv')))
C={'USA':0,'USSR':1,'UK':2,'FRANCE':3,'CHINA':4,'INDIA':5,'PAKIST':6}
FIX={'PAMUK UZBEK':(38.95,65.2),'SEMI KAZAKH':(49.95,78.4),'UKRAINE':(49.4,35.4),'UKEAINE':(48.2,38.25),'JAKUTS RUSS':(66.1,112.6),
     'BASHKIR RUSS':(53.4,56.0),'BASHKI RUSS':(53.4,56.0),'MURUROA':(-21.83,-138.88),'NTS':(37.1,-116.05),'TUYMEN RUSS':(61.9,72.1)}
# nombres legibles de las zonas (castellano; se traducen en la app)
REG={'NTS':'Nevada (EE. UU.)','NELLIS NV':'Nevada (EE. UU.)','MELLIS NV':'Nevada (EE. UU.)','C. NEVADA':'Nevada central (EE. UU.)','FALLON NV':'Fallon, Nevada (EE. UU.)',
 'SEMI KAZAKH':'Semipalatinsk (Kazajistán)','MURUROA':'Moruroa (Polinesia francesa)','MUEUEOA':'Moruroa (Polinesia francesa)','MURUHOA':'Moruroa (Polinesia francesa)','MURUEOA':'Moruroa (Polinesia francesa)',
 'NZ RUSS':'Nueva Zembla (Rusia)','N2 RUSS':'Nueva Zembla (Rusia)','LOP NOR':'Lop Nur (China)','ENEWETAK':'Enewetak (Islas Marshall)','CHRISTMAS IS':'Isla de Navidad (Kiribati)',
 'BIKINI':'Bikini (Islas Marshall)','ASTRAK RUSS':'Astracán (Rusia)','IN ECKER ALG':'In Ekker (Argelia)','AZGIR KAZAKH':'Azgir (Kazajistán)','AZGIR':'Azgir (Kazajistán)','FANGATAUFA':'Fangataufa (Polinesia francesa)',
 'JOHNSTON IS':'Atolón Johnston (Pacífico)','JAKUTS RUSS':'Yakutia (Rusia)','KAZAKH':'Kazajistán','KAZAKHSTAN':'Kazajistán','MTR RUSS':'Rusia','HTR RUSS':'Rusia','KRASNO RUSS':'Krasnoyarsk (Rusia)','PERM RUSS':'Perm (Rusia)',
 'MARALI AUSTR':'Maralinga (Australia)','TYUMEN RUSS':'Tiumén (Rusia)','TUYMEN RUSS':'Tiumén (Rusia)','ORENBG RUSS':'Oremburgo (Rusia)','BASHKIR RUSS':'Baskortostán (Rusia)','BASHKI RUSS':'Baskortostán (Rusia)',
 'REGGANE ALG':'Reggane (Argelia)','ARKHAN RUSS':'Arcángel (Rusia)','MONTEB AUSTR':'Islas Montebello (Australia)','MALDEN IS':'Isla Malden (Kiribati)','PACIFIC':'Océano Pacífico','AMCHITKA AK':'Amchitka (Alaska)',
 'MANGY KAZAKH':'Mangyshlak (Kazajistán)','URAL RUSS':'Urales (Rusia)','POKHRAN':'Pokhran (India)','EMU AUSTR':'Emu Field (Australia)','S.ATLANTIC':'Atlántico Sur','S. ATLANTIC':'Atlántico Sur',
 'MURM RUSS':'Múrmansk (Rusia)','KOMI RUSS':'Komi (Rusia)','IRKUTS RUSS':'Irkutsk (Rusia)','ALAMOGORDO':'Alamogordo, Nuevo México (EE. UU.)','HIROSHIMA':'Hiroshima (Japón)','NAGASAKI':'Nagasaki (Japón)',
 'OFFUSWCOAST':'Océano Pacífico, frente a California','CARLSBAD NM':'Carlsbad, Nuevo México (EE. UU.)','HATTIESB MS':'Hattiesburg, Misisipi (EE. UU.)','HATTIESE MS':'Hattiesburg, Misisipi (EE. UU.)',
 'UZBEK':'Uzbekistán','PAMUK UZBEK':'Pamuk (Uzbekistán)','FARMINGT NM':'Farmington, Nuevo México (EE. UU.)','GRAND V CO':'Grand Valley, Colorado (EE. UU.)','STAVRO RUSS':'Stávropol (Rusia)',
 'UKRAINE':'Járkov (Ucrania)','UKEAINE':'Donetsk (Ucrania)','CHAGAI':'Chagai (Pakistán)','KHARAN':'Kharan (Pakistán)','PUNGGYE':'Punggye-ri (Corea del Norte)','MARY TURKMEN':'Mary (Turkmenistán)','KALMYK RUSS':'Kalmukia (Rusia)','RIFLE CO':'Rifle, Colorado (EE. UU.)','W MURUROA':'Moruroa (Polinesia francesa)','WSW MURUROA':'Moruroa (Polinesia francesa)','CHITA RUSS':'Chitá (Rusia)','JAKUTS RUSE':'Yakutia (Rusia)','AZGIE KAZAKH':'Azgir (Kazajistán)','KZ RUSS':'Kazajistán','KEMERO RUSS':'Kémerovo (Rusia)','W KAZAKH':'Kazajistán occidental','HURUROA':'Moruroa (Polinesia francesa)','FANGATAUFAA':'Fangataufa (Polinesia francesa)'}
EXACT={'TRINITY':(33.677,-106.475),'LITTLEBOY':(34.3955,132.4536),'FATMAN':(32.7737,129.8633)}
def kind(r, alt):
    t=r['type']; p=r['purpose']
    if p=='COMBAT': return 4
    if t in ('SPACE',) or alt>30: return 3
    if t=='UW': return 2
    if t in ('SHAFT','TUNNEL','SHAFT/GR','SHAFT/LG','UG','GALLERY','MINE','CRATER'): return 1
    return 0
def purpose(p):
    if p=='COMBAT': return 2
    if p.startswith('PNE'): return 1
    return 0
regions=[]; out=[]
base=datetime.date(1945,1,1)
for r in rows:
    d=r['date_long']; dt=datetime.date(int(d[:4]),int(d[4:6]),int(d[6:8]))
    reg=r['region'].strip()
    lat=num(r['latitude']); lon=num(r['longitude'])
    if lat==0 and lon==0: lat,lon=FIX[reg]
    nm=r['name'].strip()
    if nm=='LITTLEBOY': dt=datetime.date(1945,8,6)
    if nm in EXACT: lat,lon=EXACT[nm]
    alt=-num(r['depth'])
    lo,hi=num(r['yield_lower']),num(r['yield_upper']); y=(lo+hi)/2 if lo>0 and hi>0 else (hi or lo)
    name='' if nm in ('NA','') else nm.title().replace('Littleboy','Little Boy').replace('Fatman','Fat Man')
    rn=REG.get(reg, reg.title())
    if rn not in regions: regions.append(rn)
    out.append([(dt-base).days, C[r['country']], round(lat,2), round(lon,2), round(y,3), kind(r,alt), purpose(r['purpose']), name, regions.index(rn)])
# Corea del Norte (2006–2017), Punggye-ri; rendimientos estimados (valores centrales)
NK=[('2006-10-09',0.7),('2009-05-25',4),('2013-02-12',10),('2016-01-06',10),('2016-09-09',15),('2017-09-03',200)]
rn='Punggye-ri (Corea del Norte)'; regions.append(rn)
for i,(ds,y) in enumerate(NK):
    dt=datetime.date.fromisoformat(ds)
    out.append([(dt-base).days, 7, 41.28, 129.08, y, 1, 0, '', regions.index(rn)])
out.sort(key=lambda x:x[0])
json.dump({'regions':regions,'tests':out}, open('src/data/tests-history.json','w'), ensure_ascii=False, separators=(',',':'))
print(len(out), len(regions))
import collections; print(collections.Counter(x[5] for x in out)); print(sum(x[4] for x in out)/1000,'Mt')
