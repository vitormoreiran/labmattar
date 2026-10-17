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
assert content.count('EditorialAssembly')==3
assert '  </main>}{editorial&&notice' in content
# Reuse the original correspondence JSX (analysis, contour selection and adjustments).
# Do not fork the actual v72 handlers or rebuild mapping logic.
marker = '{panel==="Correspondência"?'
end_marker = ':<div className="stage">'
start = content.index(marker) + len(marker)
end = content.index(end_marker, start)
correspondence_markup = content[start:end]
assert correspondence_markup.lstrip().startswith('<div className="correspondence-stage">')
assert correspondence_markup.rstrip().endswith('</div>')
content = content.replace(
    '    render={<svg viewBox="0 0 1000 1000"',
    '    correspondence={' + correspondence_markup + '}\n    render={<svg viewBox="0 0 1000 1000"',
    1,
)

# Identity-first: load the actual M and nine vessels, not the previous eight generic presets.
# Only skip an existing project when it is the old bundled sample; preserve custom saved work.
content = content.replace(
    'if(Array.isArray(saved.assets)&&saved.assets.length>=2){',
    'if(Array.isArray(saved.assets)&&saved.assets.length>=2 && !saved.assets.every((a:VectorAsset)=>/^Estado [0-9]+$/.test(a.name))){',
    1,
)
old_start = content.index('    let legacySaved:Record<string,unknown>|null=null;')
old_end = content.index('    if(active){',old_start)
replacement = """    const names=["M.svg",...Array.from({length:9},(_,i)=>`vaso_${String(i+1).padStart(2,"0")}.svg`)];
    const cleanAssets:VectorAsset[]=await Promise.all(names.map(async name=>{
      const response=await fetch(`/identidade/${name}`);
      if(!response.ok)throw new Error(`Vetor oficial ausente: ${name}`);
      return parseSvg(await response.text(),name==="M.svg"?"M":`Vaso ${name.slice(5,7)}`);
    }));
    const durationsNext=Array.from({length:cleanAssets.length-1},()=>2.5);
    const densityNext=500,scaleModeNext:"bounds"="bounds",paddingNext=14;
    const easingsNext=durationsNext.map(()=>"smooth" as EaseName);
    const customCurvesNext=durationsNext.map(()=>[...DEFAULT_CURVE] as BezierCurve);
    const loopNext=false,exportColorNext="#181814",exportBackgroundNext="#ffffff";
    const exportDensityNext=4000,exportResolutionNext=2160,exportFpsNext=60;
    const exportQualityNext:ExportQuality="maximum",exportSvgLoopNext=false,roundnessNext=55;
"""
content = content[:old_start]+replacement+content[old_end:]
# The timeline must not simply skip to a static frame when a vessel is selected.
content = content.replace(
    '    go={goState}',
    '    go={index=>{setSelected(index);setTime(index===0?0:stateTimes[index-1]);setPlaying(true)}}',
    1,
)
# During automatic playback the index follows the active segment, including the last frame.
content = content.replace(
    '    selected={selected}',
    '    selected={time>=totalDuration?assets.length-1:segment.index}',
    1,
)
# Make the active preview use exactly the same SVG rendering code as the original v72 editor.
content = content.replace(
    '    render={<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">',
    '    render={<svg viewBox="0 0 1000 1000" className="vector-canvas" preserveAspectRatio="xMidYMid meet">',
    1,
)
# Avoid resetting to a vector display that omits the active morph during the transition.
assert 'const cleanAssets:VectorAsset[]=await Promise.all(names.map' in content


# Topology correction for compound SVG paths and unmatched holes.
# Work on the original source before saving the patched entry point.
old_hole = "holes.push(subpathIndex>0);"
assert old_hole in content
content=content.replace(
  old_hole,
  "holes.push(false);",
  1,
)
old_parse = "    return { name: name.replace(/\\.svg$/i, \"\"), contours, viewBox, sourceCount: paths.length, components, holes };"
assert old_parse in content
content=content.replace(
  old_parse,
  """    // Subpath order does not define whether a contour is a hole.
    // Reclassify each compound path using geometric nesting instead.
    const classified=contourHierarchy(contours);
    return { name: name.replace(/\\.svg$/i, ""), contours, viewBox, sourceCount: paths.length, components:classified.components, holes:classified.holes };""",
  1,
)
old_matching = "if(splitting&&pair.a===null){"
assert old_matching in content
content=content.replace(
  old_matching,
  "if(pair.a===null){",
  1,
)
old_merging = "if(merging&&pair.b===null){"
assert old_merging in content
content=content.replace(
  old_merging,
  "if(pair.b===null){",
  1,
)
# Avoid turning a hole into a black exterior when unmatched in an opposite frame:
# the generated disappearing or appearing contour should retain its hole polarity.
content=content.replace(
  "holesA.push(pair.a===null?false:fromHoles[sourceIndex]);holesB.push(pair.b===null?false:toHoles[targetIndex]);",
  "holesA.push(pair.a===null?toHoles[targetIndex]:fromHoles[sourceIndex]);holesB.push(pair.b===null?fromHoles[sourceIndex]:toHoles[targetIndex]);",
  1,
)
# Explicitly avoid topology continuity being treated as native when hole inventories differ.
# The existing topology check is left intact; its compatibility decision remains authoritative.
assert 'components:classified.components, holes:classified.holes' in content
assert 'if(pair.a===null)' in content

source.write_text(content,encoding="utf-8")
print("Patched editor to use native v72 states and geometry with editorial montage.")
