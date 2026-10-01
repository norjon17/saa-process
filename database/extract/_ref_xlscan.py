import zipfile, sys, re, xml.etree.ElementTree as ET, time, json
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
def col2n(s):
    n=0
    for ch in s: n=n*26+ord(ch)-64
    return n
def scan(path, only=None):
    z=zipfile.ZipFile(path)
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels={r.get('Id'):r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    ss=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for _,el in ET.iterparse(z.open('xl/sharedStrings.xml')):
            if el.tag==NS+'si': ss.append(''.join(t.text or '' for t in el.iter(NS+'t'))); el.clear()
    out={}
    for sh in wb.iter(NS+'sheet'):
        name=sh.get('name'); tgt=rels[sh.get(RNS+'id')]
        if 'worksheets' not in tgt: continue
        if only and name not in only: continue
        t0=time.time(); st=dict(state=sh.get('state','visible'),rows=0,cells=0,valued=0,formulas=0,maxr=0,maxc=0,merged=0,cf=0,dv=0,dim=None,styled_empty=0)
        for ev,el in ET.iterparse(z.open('xl/'+tgt)):
            tag=el.tag[len(NS):] if el.tag.startswith(NS) else el.tag
            if tag=='row': st['rows']+=1; el.clear()
            elif tag=='c':
                st['cells']+=1
                v=el.find(NS+'v'); f=el.find(NS+'f'); isv=el.find(NS+'is')
                if f is not None: st['formulas']+=1
                if v is not None or isv is not None:
                    st['valued']+=1
                    m=re.match(r'([A-Z]+)(\d+)',el.get('r'))
                    st['maxr']=max(st['maxr'],int(m.group(2))); st['maxc']=max(st['maxc'],col2n(m.group(1)))
                else: st['styled_empty']+=1
            elif tag=='dimension': st['dim']=el.get('ref')
            elif tag=='mergeCell': st['merged']+=1
            elif tag=='conditionalFormatting': st['cf']+=1
            elif tag=='dataValidation': st['dv']+=1
        st['secs']=round(time.time()-t0,1); out[name]=st
        print(json.dumps({name:st}),flush=True)
    return out
if __name__=='__main__':
    scan(sys.argv[1], sys.argv[2:] or None)
