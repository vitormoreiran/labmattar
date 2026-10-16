from pathlib import Path

source = Path("app/editor/page.tsx")
content = source.read_text(encoding="utf-8")
assert 'import { useEffect, useMemo, useRef, useState } from "react";' in content
assert '  return <main className="app-shell"' in content
assert 'function Toggle(' in content

content = content.replace(
    'import { useEffect, useMemo, useRef, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";\nimport EditorialAssembly from "./EditorialAssembly";',
    1,
)
content = content.replace(
    'export default function Home() {',
    'export default function Home() {\n  const [editorial,setEditorial]=useState(true);',
    1,
)

begin = '''  return <>{editorial ? <EditorialAssembly
    assets={assets}
    selected={selected}
    time={time}
    totalDuration={totalDuration}
    ready={geometryReady}
    playing={playing}
    loop={loop}
    inputRef={input}
    render={<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <g opacity={usesTopologyNative?1:0} transform={pairTransform}>
        <UnionComponents contours={nativeContours} groups={usesTopologyNative?assetComponents(assets[segment.index]):[]}/>
      </g>
      <g opacity={usesTopologyNative?0:1}>
        <UnionComponents contours={displayContours} groups={currentGroups}/>
      </g>
    </svg>}
    go={goState}
    seek={value=>{setPlaying(false);setTime(value)}}
    play={()=>setPlaying(value=>!value)}
    previous={()=>goState(Math.max(0,segment.index))}
    next={()=>goState(Math.min(assets.length-1,segment.index+1))}
    openAdd={()=>openImport("add")}
    addFiles={importFiles}
    move={moveState}
    remove={removeState}
    replace={()=>openImport("replace")}
    reset={loadOfficialIdentity}
    save={saveProject}
    download={downloadProject}
    openTechnical={mode=>{setPanel(mode);setEditorial(false)}}
  /> : <main className="app-shell"'''
content=content.replace('  return <main className="app-shell"',begin,1)
content=content.replace(
    '<nav className="panel-tabs">{panels.map(item=>',
    '<nav className="panel-tabs"><button onClick={()=>setEditorial(true)}>← VISÃO EDITORIAL</button>{panels.map(item=>',
    1,
)
content=content.replace('    </section>{notice&&<div className="toast">{notice}</div>}\n  </main>','    </section>{notice&&<div className="toast">{notice}</div>}\n  </main>}</>',1)
# Keep notification visible while the editorial shell is active.
content=content.replace('  </main>}</>','  </main>}{editorial&&notice&&<div role="status" className="lm-toast">{notice}</div>}</>',1)
assert content.count('EditorialAssembly')==2
assert '  </main>}{editorial&&notice' in content
source.write_text(content,encoding="utf-8")
print("Patched editor to use native v72 states and geometry with editorial montage.")
