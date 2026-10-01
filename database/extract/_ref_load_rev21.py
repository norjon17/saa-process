import zipfile, re, pickle, xml.etree.ElementTree as ET
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
P="/d/Workstation/evalice/docs/all/all about/1st Meancheck excel template/First Mean Check Monitoring Rev2.1_NEW.xlsx".replace('/d/','D:/')
z=zipfile.ZipFile(P)
ss=[]
for _,el in ET.iterparse(z.open('xl/sharedStrings.xml')):
    if el.tag==NS+'si': ss.append(''.join(t.text or '' for t in el.iter(NS+'t'))); el.clear()
def col2n(s):
    n=0
    for ch in s: n=n*26+ord(ch)-64
    return n
out={}
for name,part in (('Rev2.1','xl/worksheets/sheet4.xml'),('Rev2','xl/worksheets/sheet3.xml'),('Monitoring','xl/worksheets/sheet1.xml'),('Sheet1','xl/worksheets/sheet2.xml')):
    cells={}; merges=[]; cfs=[]
    for ev,el in ET.iterparse(z.open(part)):
        if el.tag==NS+'c':
            v=el.find(NS+'v'); f=el.find(NS+'f')
            if v is not None or f is not None:
                m=re.match(r'([A-Z]+)(\d+)',el.get('r')); t=el.get('t')
                val=v.text if v is not None else None
                if t=='s' and val is not None: val=ss[int(val)]
                ftxt=None
                if f is not None: ftxt=(f.text, f.get('t'), f.get('ref'), f.get('si'))
                cells[(int(m.group(2)),col2n(m.group(1)))]=(val,ftxt)
            el.clear()
        elif el.tag==NS+'mergeCell': merges.append(el.get('ref'))
        elif el.tag==NS+'conditionalFormatting':
            rules=[(r.get('type'),r.get('operator'),[x.text for x in r.iter(NS+'formula')]) for r in el.iter(NS+'cfRule')]
            cfs.append((el.get('sqref'),rules)); el.clear()
        elif el.tag==NS+'row': el.clear()
    out[name]=dict(cells=cells,merges=merges,cfs=cfs); print(name,len(cells),len(merges),len(cfs),flush=True)
pickle.dump(out,open(r"C:\Users\Capul\AppData\Local\Temp\claude\d--Workstation-evalice-saa-process-project\f98322bb-b845-47d6-8531-ebdac5ab2fb5\scratchpad\rev21.pkl","wb"))
