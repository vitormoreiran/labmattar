"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";

const shapeA = [
  [170, 92], [202, 92], [237, 171], [271, 92], [303, 92], [342, 244],
  [305, 244], [279, 139], [250, 211], [224, 211], [195, 139], [170, 244],
  [133, 244], [170, 92],
];
const shapeB = [
  [134, 118], [175, 83], [234, 75], [292, 99], [331, 148], [328, 205],
  [290, 248], [232, 261], [175, 245], [137, 205], [130, 160], [156, 137],
  [205, 130], [134, 118],
];

const panels = ["Composição", "Matriz", "Correspondência", "Exportar"];
const PROJECT_KEY="matriz-vetorial-sequencia-1-8-stop-v13";
const LEGACY_PROJECT_KEYS=["matriz-vetorial-sequencia-1-8-stop-v12","matriz-vetorial-sequencia-1-8-stop-v11","matriz-vetorial-sequencia-1-8-stop-v10"];

type Point = { x: number; y: number; corner?: boolean };
type VectorAsset = { name: string; contours: string[]; viewBox: string; sourceCount: number; components?:number[]; holes?:boolean[] };
type PathBox={x:number;y:number;width:number;height:number};
type NativePathChannel={parts:string[];a:number[];b:number[];boxA?:PathBox;boxB?:PathBox};
type TransitionMatrix={a:Point[][];mid?:Point[][];b:Point[][];allocation:number[];semantic?:boolean;groupsA?:number[];groupsB?:number[];holesA?:boolean[];holesB?:boolean[];absorbing?:boolean[];renderGroups?:number[];direction?:"merge"|"split"|"pair";sourceIndices?:(number|null)[];targetIndices?:(number|null)[];nativeChannels?:boolean[];nativePaths?:(NativePathChannel|null)[]};
type ScaleMode = "bounds" | "viewBox" | "raw";
type ExportQuality = "high" | "maximum" | "master";
const numberPattern=/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
type MorphEngine=typeof import("gsap/MorphSVGPlugin")["MorphSVGPlugin"];
let morphEngine:MorphEngine|null=null,morphEnginePromise:Promise<MorphEngine>|null=null;
function loadMorphEngine(){return morphEngine?Promise.resolve(morphEngine):(morphEnginePromise??=import("gsap/MorphSVGPlugin").then(module=>(morphEngine=module.MorphSVGPlugin)))}

const initialAssets: VectorAsset[] = [
  { name: "M — matriz base", contours: [pathFrom(shapeA)], viewBox: "0 0 470 340", sourceCount: 1 },
  { name: "módulo orbital", contours: [pathFrom(shapeB)], viewBox: "0 0 470 340", sourceCount: 1 },
];

function pathFrom(points: number[][]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}
function safeTangent(before:Point,current:Point,after:Point){
  if(current.corner)return {x:0,y:0};
  const x=after.x-before.x,y=after.y-before.y,length=Math.hypot(x,y),beforeLength=Math.hypot(current.x-before.x,current.y-before.y),afterLength=Math.hypot(after.x-current.x,after.y-current.y);
  if(length<1e-6||beforeLength<1e-6||afterLength<1e-6)return {x:0,y:0};
  const harmonic=2*beforeLength*afterLength/(beforeLength+afterLength),magnitude=Math.min(harmonic*.92,Math.min(beforeLength,afterLength)*1.35);
  return {x:x/length*magnitude,y:y/length*magnitude};
}

function pointsPath(contours: Point[][]) {
  return contours.map(points => {
    if(points.length<3)return points.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")+" Z";
    let d=`M${points[0].x.toFixed(3)},${points[0].y.toFixed(3)}`;
    for(let i=0;i<points.length;i++){
      const p0=points[(i-1+points.length)%points.length],p1=points[i],p2=points[(i+1)%points.length],p3=points[(i+2)%points.length];
      const chord=Math.hypot(p2.x-p1.x,p2.y-p1.y);if(chord<.001){d+=` L${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;continue}
      const t1=safeTangent(p0,p1,p2),t2=safeTangent(p1,p2,p3),c1={x:p1.x+t1.x/3,y:p1.y+t1.y/3},c2={x:p2.x-t2.x/3,y:p2.y-t2.y/3};
      d+=` C${c1.x.toFixed(3)},${c1.y.toFixed(3)} ${c2.x.toFixed(3)},${c2.y.toFixed(3)} ${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
    }
    return d+" Z";
  }).join(" ");
}

function pathMetrics(d: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.style.cssText = "position:fixed;left:-10000px;top:-10000px"; path.setAttribute("d", d); svg.appendChild(path); document.body.appendChild(svg);
  return { path, length: path.getTotalLength(), dispose: () => svg.remove() };
}

function sampleContour(d: string, count: number): Point[] {
  const metric = pathMetrics(d);
  try { return Array.from({length:count}, (_,i) => { const p = metric.path.getPointAtLength(metric.length * i / count); return {x:p.x,y:p.y}; }); }
  finally { metric.dispose(); }
}
type CubicSegment={p0:Point;c1:Point;c2:Point;p1:Point};
function cubicSegments(d:string):CubicSegment[]|null{
  const values=(d.match(numberPattern)||[]).map(Number);
  if(values.length<8||(values.length-2)%6!==0||!/^\s*M/i.test(d)||!/[Cc]/.test(d))return null;
  const segments:CubicSegment[]=[];let p0={x:values[0],y:values[1]};
  for(let index=2;index<values.length;index+=6){const segment={p0,c1:{x:values[index],y:values[index+1]},c2:{x:values[index+2],y:values[index+3]},p1:{x:values[index+4],y:values[index+5]}};segments.push(segment);p0=segment.p1}
  return segments;
}
function cubicPoint(segment:CubicSegment,t:number):Point{const u=1-t,uu=u*u,tt=t*t;return {x:uu*u*segment.p0.x+3*uu*t*segment.c1.x+3*u*tt*segment.c2.x+tt*t*segment.p1.x,y:uu*u*segment.p0.y+3*uu*t*segment.c1.y+3*u*tt*segment.c2.y+tt*t*segment.p1.y}}
function cubicLength(segment:CubicSegment){let length=0,before=segment.p0;for(let index=1;index<=12;index++){const point=cubicPoint(segment,index/12);length+=Math.hypot(point.x-before.x,point.y-before.y);before=point}return length}
function lerpPoint(a:Point,b:Point,t:number):Point{return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}
function splitCubic(segment:CubicSegment,t:number):[CubicSegment,CubicSegment]{
  const p01=lerpPoint(segment.p0,segment.c1,t),p12=lerpPoint(segment.c1,segment.c2,t),p23=lerpPoint(segment.c2,segment.p1,t),p012=lerpPoint(p01,p12,t),p123=lerpPoint(p12,p23,t),pivot=lerpPoint(p012,p123,t);
  return [{p0:segment.p0,c1:p01,c2:p012,p1:pivot},{p0:pivot,c1:p123,c2:p23,p1:segment.p1}];
}
function subdivideCubic(segment:CubicSegment,parts:number){
  if(parts<=1)return [segment];const result:CubicSegment[]=[];let remaining=segment;
  for(let index=parts;index>1;index--){const [head,tail]=splitCubic(remaining,1/index);result.push(head);remaining=tail}result.push(remaining);return result;
}
function allocateCubicSubdivisions(lengths:number[],total:number){
  const count=Math.max(lengths.length,total),result=lengths.map(()=>1),remaining=count-lengths.length,sum=lengths.reduce((value,length)=>value+length,0)||1,exact=lengths.map(length=>remaining*length/sum),base=exact.map(Math.floor);
  base.forEach((value,index)=>result[index]+=value);let missing=remaining-base.reduce((value,item)=>value+item,0);
  exact.map((value,index)=>({index,fraction:value-Math.floor(value)})).sort((a,b)=>b.fraction-a.fraction).slice(0,missing).forEach(item=>{result[item.index]++;missing--});return result;
}
function exactSubdividedPath(d:string,totalSegments:number){
  const segments=cubicSegments(d);if(!segments?.length)return null;const allocation=allocateCubicSubdivisions(segments.map(cubicLength),totalSegments),expanded=segments.flatMap((segment,index)=>subdivideCubic(segment,allocation[index]));
  let path=`M${expanded[0].p0.x},${expanded[0].p0.y}`;for(const segment of expanded)path+=` C${segment.c1.x},${segment.c1.y} ${segment.c2.x},${segment.c2.y} ${segment.p1.x},${segment.p1.y}`;return path+" z";
}
function segmentCorner(segments:CubicSegment[],index:number){
  const previous=segments[(index-1+segments.length)%segments.length],current=segments[index],point=current.p0;
  let incoming={x:point.x-previous.c2.x,y:point.y-previous.c2.y},outgoing={x:current.c1.x-point.x,y:current.c1.y-point.y};
  let incomingLength=Math.hypot(incoming.x,incoming.y),outgoingLength=Math.hypot(outgoing.x,outgoing.y);
  if(incomingLength<1e-5){incoming={x:point.x-previous.p0.x,y:point.y-previous.p0.y};incomingLength=Math.hypot(incoming.x,incoming.y)}
  if(outgoingLength<1e-5){outgoing={x:current.p1.x-point.x,y:current.p1.y-point.y};outgoingLength=Math.hypot(outgoing.x,outgoing.y)}
  if(incomingLength<1e-5||outgoingLength<1e-5)return false;
  const alignment=(incoming.x*outgoing.x+incoming.y*outgoing.y)/(incomingLength*outgoingLength);
  return alignment<.965;
}
function localPathNumbers(d:string,box:PathBox){return (d.match(numberPattern)||[]).map((value,index)=>index%2===0?(Number(value)-box.x)/box.width:(Number(value)-box.y)/box.height)}
function orderedNativeStrings(sourceD:string,targetD:string,sourceBox:PathBox,targetBox:PathBox){
  if(!morphEngine)return [sourceD,targetD] as [string,string];
  let baseline:[string,string];try{baseline=morphEngine.normalizeStrings(sourceD,targetD,{shapeIndex:0,map:"complexity"}) as [string,string]}catch{return [sourceD,targetD]}
  const segmentCount=Math.max(1,Math.round(((baseline[0].match(numberPattern)||[]).length-2)/6));let best=baseline,bestScore=Infinity;
  for(let shift=0;shift<segmentCount;shift++){
    try{
      const candidate=morphEngine.normalizeStrings(sourceD,targetD,{shapeIndex:shift,map:"complexity"}) as [string,string],a=localPathNumbers(candidate[0],sourceBox),b=localPathNumbers(candidate[1],targetBox);if(a.length!==b.length)continue;
      let score=0;for(let index=0;index<a.length;index++){const delta=a[index]-b[index],anchorWeight=index%6<2?3:1;score+=delta*delta*anchorWeight}score/=Math.max(1,a.length);
      if(score<bestScore){bestScore=score;best=candidate}
    }catch{/* ignora apenas esta rotação; nunca inverte o contorno */}
  }
  return best;
}
function cubicPath(segments:CubicSegment[]){
  if(!segments.length)return "";let path=`M${segments[0].p0.x},${segments[0].p0.y}`;
  for(const segment of segments)path+=` C${segment.c1.x},${segment.c1.y} ${segment.c2.x},${segment.c2.y} ${segment.p1.x},${segment.p1.y}`;
  return path+" z";
}
function zeroCubic(point:Point):CubicSegment{return {p0:point,c1:point,c2:point,p1:point}}
function terminalRPathChannel(sourceD:string,targetD:string,normalizeA:(point:Point)=>Point,normalizeB:(point:Point)=>Point,sourceBox:PathBox,targetBox:PathBox){
  const [orderedSource,orderedTarget]=orderedNativeStrings(sourceD,targetD,sourceBox,targetBox),sourceSegments=cubicSegments(orderedSource),targetSegments=cubicSegments(orderedTarget);
  if(!sourceSegments||!targetSegments||sourceSegments.length!==targetSegments.length)return nativePathChannel(orderedSource,orderedTarget,normalizeA,normalizeB,sourceBox,targetBox);
  const legEdges=(segments:CubicSegment[],box:PathBox)=>segments.map((segment,index)=>{
    const a={x:(segment.p0.x-box.x)/box.width,y:(segment.p0.y-box.y)/box.height},b={x:(segment.p1.x-box.x)/box.width,y:(segment.p1.y-box.y)/box.height};
    return {index,a,b};
  }).filter(({a,b})=>Math.max(a.x,b.x)>.92&&Math.min(a.x,b.x)<.48&&Math.min(a.y,b.y)>.52&&Math.abs(a.x-b.x)>.35&&Math.abs(a.y-b.y)>.045).map(item=>item.index);
  const sourceLeg=legEdges(sourceSegments,sourceBox),targetLeg=legEdges(targetSegments,targetBox),offset=(targetLeg[0]??0)-(sourceLeg[0]??0);
  if(offset!==1||sourceLeg.length!==2||targetLeg.length!==2)return nativePathChannel(orderedSource,orderedTarget,normalizeA,normalizeB,sourceBox,targetBox);
  const source=[...sourceSegments],target=[...targetSegments],sourceJoin=source[sourceLeg[0]].p0,targetClose=target[target.length-1].p1;
  source.splice(sourceLeg[0],0,zeroCubic(sourceJoin));target.push(zeroCubic(targetClose));
  return nativePathChannel(cubicPath(source),cubicPath(target),normalizeA,normalizeB,sourceBox,targetBox);
}
function rotateCubics(segments:CubicSegment[],index:number){return [...segments.slice(index),...segments.slice(0,index)]}
function topRightStart(segments:CubicSegment[]){
  const points=segments.map((segment,index)=>({index,point:segment.p0})),minY=Math.min(...points.map(item=>item.point.y)),maxY=Math.max(...points.map(item=>item.point.y)),band=minY+(maxY-minY)*.04;
  return points.filter(item=>item.point.y<=band).sort((a,b)=>b.point.x-a.point.x)[0]?.index??0;
}
function cubicParameterAtLength(segment:CubicSegment,distance:number){
  const total=cubicLength(segment);if(distance<=0)return 0;if(distance>=total)return 1;let low=0,high=1;
  for(let index=0;index<18;index++){const middle=(low+high)/2,[head]=splitCubic(segment,middle);if(cubicLength(head)<distance)low=middle;else high=middle}
  return (low+high)/2;
}
function splitCubicRegionAtFractions(segments:CubicSegment[],fractions:number[]){
  const lengths=segments.map(cubicLength),total=lengths.reduce((sum,value)=>sum+value,0)||1,boundaries=fractions.filter(value=>value>1e-6&&value<1-1e-6).map(value=>value*total),result:CubicSegment[]=[];let cursor=0;
  segments.forEach((segment,index)=>{
    const length=lengths[index],local=boundaries.filter(distance=>distance>cursor+1e-6&&distance<cursor+length-1e-6).map(distance=>cubicParameterAtLength(segment,distance-cursor));let remaining=segment,previous=0;
    for(const parameter of local){const relative=(parameter-previous)/(1-previous),[head,tail]=splitCubic(remaining,relative);result.push(head);remaining=tail;previous=parameter}
    result.push(remaining);cursor+=length;
  });
  return result;
}
function matchedCubicRegions(source:CubicSegment[],target:CubicSegment[]){
  if(!source.length||!target.length)return null;
  const boundaryFractions=(segments:CubicSegment[])=>{const lengths=segments.map(cubicLength),total=lengths.reduce((sum,value)=>sum+value,0)||1;let cursor=0;return lengths.slice(0,-1).map(length=>(cursor+=length)/total)},uniformCount=Math.max(source.length,target.length)*2;
  const fractions=[...boundaryFractions(source),...boundaryFractions(target),...Array.from({length:Math.max(0,uniformCount-1)},(_,index)=>(index+1)/uniformCount)].sort((a,b)=>a-b).filter((value,index,items)=>index===0||Math.abs(value-items[index-1])>1e-5),alignedSource=splitCubicRegionAtFractions(source,fractions),alignedTarget=splitCubicRegionAtFractions(target,fractions);
  return alignedSource.length===alignedTarget.length?[alignedSource,alignedTarget] as const:null;
}
function structuralMPathChannel(sourceD:string,targetD:string,normalizeA:(point:Point)=>Point,normalizeB:(point:Point)=>Point,sourceBox:PathBox,targetBox:PathBox){
  const rawSource=cubicSegments(sourceD),rawTarget=cubicSegments(targetD);if(!rawSource||!rawTarget)return null;
  const targetScale=Math.hypot(targetBox.width,targetBox.height),targetClean=rawTarget.filter(segment=>cubicLength(segment)>targetScale*1e-5),source=rotateCubics(rawSource,topRightStart(rawSource)),target=rotateCubics(targetClean,topRightStart(targetClean));
  const sourceRegions=[4,2,4,3,2,12,2,3],targetRegions=[3,1,3,1,2,4,1,1];
  if(source.length!==sourceRegions.reduce((sum,value)=>sum+value,0)||target.length!==targetRegions.reduce((sum,value)=>sum+value,0))return null;
  const alignedSource:CubicSegment[]=[],alignedTarget:CubicSegment[]=[];let sourceCursor=0,targetCursor=0;
  for(let region=0;region<sourceRegions.length;region++){
    const sourceCount=sourceRegions[region],targetCount=targetRegions[region],matched=matchedCubicRegions(source.slice(sourceCursor,sourceCursor+sourceCount),target.slice(targetCursor,targetCursor+targetCount));if(!matched)return null;
    alignedSource.push(...matched[0]);alignedTarget.push(...matched[1]);sourceCursor+=sourceCount;targetCursor+=targetCount;
  }
  if(sourceCursor!==source.length||targetCursor!==target.length||alignedSource.length!==alignedTarget.length)return null;
  return nativePathChannel(cubicPath(alignedSource),cubicPath(alignedTarget),normalizeA,normalizeB,sourceBox,targetBox);
}
function samplePairedContours(sourceD:string,targetD:string,count:number,normalizeTopology=false,sourceBox?:PathBox,targetBox?:PathBox,preserveNativeTemplate=false){
  const nativeTemplate=sourceD.replace(numberPattern,"#")===targetD.replace(numberPattern,"#");
  if(normalizeTopology&&sourceBox&&targetBox&&!(preserveNativeTemplate&&nativeTemplate))[sourceD,targetD]=orderedNativeStrings(sourceD,targetD,sourceBox,targetBox);
  else if(normalizeTopology&&!nativeTemplate&&morphEngine){try{[sourceD,targetD]=morphEngine.normalizeStrings(sourceD,targetD,{shapeIndex:"auto",map:"complexity"})}catch{/* mantém os paths autorais */}}
  const sourceSegments=cubicSegments(sourceD),targetSegments=cubicSegments(targetD);
  if(!sourceSegments||!targetSegments||sourceSegments.length!==targetSegments.length)return null;
  const weights=sourceSegments.map((segment,index)=>Math.max(cubicLength(segment),cubicLength(targetSegments[index]))),perSegment=allocatePoints(weights,count),source:Point[]=[],target:Point[]=[];
  sourceSegments.forEach((segment,index)=>{const isCorner=segmentCorner(sourceSegments,index)||segmentCorner(targetSegments,index),samples=perSegment[index];for(let sample=0;sample<samples;sample++){const t=sample/samples;source.push({...cubicPoint(segment,t),corner:sample===0&&isCorner});target.push({...cubicPoint(targetSegments[index],t),corner:sample===0&&isCorner})}});
  return {source,target,sourceD,targetD};
}
function normalizedBox(box:PathBox,normalize:(point:Point)=>Point):PathBox{
  const topLeft=normalize({x:box.x,y:box.y}),bottomRight=normalize({x:box.x+box.width,y:box.y+box.height});
  return {x:topLeft.x,y:topLeft.y,width:bottomRight.x-topLeft.x,height:bottomRight.y-topLeft.y};
}
function nativePathChannel(sourceD:string,targetD:string,normalizeA:(point:Point)=>Point,normalizeB:(point:Point)=>Point,sourceBox?:PathBox,targetBox?:PathBox):NativePathChannel|null{
  if(sourceD.replace(numberPattern,"#")!==targetD.replace(numberPattern,"#"))return null;
  const source=(sourceD.match(numberPattern)||[]).map(Number),target=(targetD.match(numberPattern)||[]).map(Number);
  if(source.length!==target.length||source.length%2!==0)return null;
  const local=Boolean(sourceBox&&targetBox),a:number[]=[],b:number[]=[];
  for(let index=0;index<source.length;index+=2){
    if(local){
      a.push((source[index]-sourceBox!.x)/sourceBox!.width,(source[index+1]-sourceBox!.y)/sourceBox!.height);
      b.push((target[index]-targetBox!.x)/targetBox!.width,(target[index+1]-targetBox!.y)/targetBox!.height);
    }else{
      const pa=normalizeA({x:source[index],y:source[index+1]}),pb=normalizeB({x:target[index],y:target[index+1]});a.push(pa.x,pa.y);b.push(pb.x,pb.y);
    }
  }
  return {parts:sourceD.split(numberPattern),a,b,...(local?{boxA:normalizedBox(sourceBox!,normalizeA),boxB:normalizedBox(targetBox!,normalizeB)}:{})};
}
function exactContourPathChannel(sourceD:string,targetD:string,normalizeA:(point:Point)=>Point,normalizeB:(point:Point)=>Point,sourceBox:PathBox,targetBox:PathBox,count:number):NativePathChannel|null{
  const sourceSegments=cubicSegments(sourceD)?.length??0,targetSegments=cubicSegments(targetD)?.length??0,total=Math.max(sourceSegments,targetSegments,Math.min(192,Math.max(72,Math.round(count*.55)))),source=exactSubdividedPath(sourceD,total),target=exactSubdividedPath(targetD,total);
  if(!source||!target)return null;return nativePathChannel(source,target,normalizeA,normalizeB,sourceBox,targetBox);
}
function interpolateNativePaths(matrix:TransitionMatrix,raw:number,ease:EaseName,custom:BezierCurve,roundness=0){
  if(!matrix.nativePaths?.some(Boolean))return null;
  const t=easeValue(ease,raw,custom),fallback=interpolateTransition(matrix,raw,ease,custom,roundness);
  return matrix.nativePaths.map((channel,index)=>{
    if(!channel)return pointsPath([fallback[index]]);
    const box=channel.boxA&&channel.boxB?{x:channel.boxA.x+(channel.boxB.x-channel.boxA.x)*t,y:channel.boxA.y+(channel.boxB.y-channel.boxA.y)*t,width:channel.boxA.width+(channel.boxB.width-channel.boxA.width)*t,height:channel.boxA.height+(channel.boxB.height-channel.boxA.height)*t}:null;
    let d=channel.parts[0];
    for(let value=0;value<channel.a.length;value++){
      const interpolated=channel.a[value]+(channel.b[value]-channel.a[value])*t,coordinate=box?(value%2===0?box.x+interpolated*box.width:box.y+interpolated*box.height):interpolated;
      d+=coordinate.toFixed(3)+channel.parts[value+1];
    }
    return d;
  });
}
function polygonContains(point:Point,polygon:Point[]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y||1e-9)+a.x;if(cross)inside=!inside}return inside}
function contourHierarchy(contours:string[]){const polygons=contours.map(d=>sampleContour(d,72)),areas=polygons.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y},0)/2)),centers=polygons.map(points=>points.reduce((sum,p)=>({x:sum.x+p.x/points.length,y:sum.y+p.y/points.length}),{x:0,y:0})),parents=contours.map((_,index)=>{const candidates=contours.map((__,i)=>i).filter(i=>i!==index&&areas[i]>areas[index]&&polygonContains(centers[index],polygons[i])).sort((a,b)=>areas[a]-areas[b]);return candidates[0]??-1}),depths=parents.map((_,index)=>{let depth=0,parent=parents[index],guard=0;while(parent>=0&&guard++<contours.length){depth++;parent=parents[parent]}return depth}),roots=parents.map((_,index)=>{let root=index,parent=parents[index],guard=0;while(parent>=0&&guard++<contours.length){root=parent;parent=parents[parent]}return root}),rootIds=new Map<number,number>();roots.forEach(root=>{if(!rootIds.has(root))rootIds.set(root,rootIds.size)});return {components:roots.map(root=>rootIds.get(root)??0),holes:depths.map(depth=>depth%2===1)}}
function assetComponents(asset:VectorAsset){return asset.components??asset.contours.map((_,i)=>i)}
function assetHoles(asset:VectorAsset){return asset.holes??asset.contours.map(()=>false)}
function componentCount(asset:VectorAsset){return new Set(assetComponents(asset)).size}

function assetBounds(asset: VectorAsset, mode: ScaleMode) {
  if (mode === "viewBox") {
    const values = asset.viewBox.trim().split(/[ ,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite)) return {x:values[0],y:values[1],width:Math.abs(values[2])||1,height:Math.abs(values[3])||1};
  }
  const points = asset.contours.flatMap(d => sampleContour(d, 72));
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  return {x:minX,y:minY,width:Math.max(0.001,maxX-minX),height:Math.max(0.001,maxY-minY)};
}

function scaleNormalizer(asset:VectorAsset, mode:ScaleMode, padding:number) {
  if(mode === "raw") return (point:Point) => point;
  const bounds=assetBounds(asset,mode), available=1000-padding*20;
  const scale=Math.min(available/bounds.width,available/bounds.height);
  const offsetX=500-(bounds.x+bounds.width/2)*scale, offsetY=500-(bounds.y+bounds.height/2)*scale;
  return (point:Point):Point => ({x:point.x*scale+offsetX,y:point.y*scale+offsetY,corner:point.corner});
}

function scaleTransform(asset:VectorAsset,mode:ScaleMode,padding:number){if(mode==="raw")return "";const bounds=assetBounds(asset,mode),available=1000-padding*20,scale=Math.min(available/bounds.width,available/bounds.height),x=500-(bounds.x+bounds.width/2)*scale,y=500-(bounds.y+bounds.height/2)*scale;return `matrix(${scale} 0 0 ${scale} ${x} ${y})`}

function allocatePoints(lengths: number[], budget: number) {
  const minimum = Math.max(3, Math.min(8, Math.floor(budget / Math.max(1, lengths.length * 2))));
  const usable = Math.max(0, budget - minimum * lengths.length);
  const total = lengths.reduce((a,b) => a+b, 0) || 1;
  const exact = lengths.map(length => minimum + usable * length / total);
  const result = exact.map(Math.floor);
  const missing = budget - result.reduce((a,b) => a+b, 0);
  exact.map((value,i) => ({i, fraction:value-Math.floor(value)})).sort((a,b)=>b.fraction-a.fraction).slice(0,missing).forEach(({i}) => result[i]++);
  return result;
}

function alignPoints(source: Point[], target: Point[]) {
  if (source.length < 2) return source;
  let best = source, bestScore = Infinity;
  const candidates = [source, [...source].reverse()];
  for (const candidate of candidates){const sampleStep=Math.max(1,Math.floor(candidate.length/160)),shiftStep=Math.max(1,Math.floor(candidate.length/160));let coarse=0,coarseScore=Infinity;const score=(shift:number)=>{let value=0;for(let i=0;i<candidate.length;i+=sampleStep){const a=candidate[(i+shift+candidate.length)%candidate.length],b=target[i];value+=(a.x-b.x)**2+(a.y-b.y)**2}return value};for(let shift=0;shift<candidate.length;shift+=shiftStep){const value=score(shift);if(value<coarseScore){coarseScore=value;coarse=shift}}for(let delta=-shiftStep;delta<=shiftStep;delta++){const shift=(coarse+delta+candidate.length)%candidate.length,value=score(shift);if(value<bestScore){bestScore=value;best=candidate.map((_,i)=>candidate[(i+shift)%candidate.length])}}}
  return best;
}
function alignPointsByFeatures(source:Point[],target:Point[]){if(source.length<3)return source;const weight=(points:Point[],i:number)=>{const a=points[(i-1+points.length)%points.length],b=points[i],c=points[(i+1)%points.length],u={x:a.x-b.x,y:a.y-b.y},v={x:c.x-b.x,y:c.y-b.y},ul=Math.hypot(u.x,u.y)||1,vl=Math.hypot(v.x,v.y)||1,turn=1-(u.x*v.x+u.y*v.y)/(ul*vl);return 1+Math.max(0,turn)*7};let best=source,bestScore=Infinity;for(const candidate of [source,[...source].reverse()]){const sampleStep=Math.max(1,Math.floor(candidate.length/192)),shiftStep=Math.max(1,Math.floor(candidate.length/192));let coarse=0,coarseScore=Infinity;const score=(shift:number)=>{let value=0;for(let i=0;i<candidate.length;i+=sampleStep){const index=(i+shift+candidate.length)%candidate.length,a=candidate[index],b=target[i],w=Math.max(weight(candidate,index),weight(target,i));value+=((a.x-b.x)**2+(a.y-b.y)**2)*w}return value};for(let shift=0;shift<candidate.length;shift+=shiftStep){const value=score(shift);if(value<coarseScore){coarseScore=value;coarse=shift}}for(let delta=-shiftStep;delta<=shiftStep;delta++){const shift=(coarse+delta+candidate.length)%candidate.length,value=score(shift);if(value<bestScore){bestScore=value;best=candidate.map((_,i)=>candidate[(i+shift)%candidate.length])}}}return best}

function rotatePoints(points:Point[],offset:number){if(!points.length)return points;const shift=((offset%points.length)+points.length)%points.length;return points.map((_,i)=>points[(i+shift)%points.length])}
function pointCenter(points:Point[]){return points.reduce((sum,p)=>({x:sum.x+p.x/points.length,y:sum.y+p.y/points.length}),{x:0,y:0})}

type ContourInfo={index:number;d:string;length:number;center:Point;area:number;hole:boolean};
function contourInfo(d:string,index:number,hole=false):ContourInfo{
  const points=sampleContour(d,96),center=points.reduce((sum,p)=>({x:sum.x+p.x/points.length,y:sum.y+p.y/points.length}),{x:0,y:0});
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y}
  const metric=pathMetrics(d);try{return {index,d,length:metric.length,center,area:Math.abs(area/2),hole}}finally{metric.dispose()}
}
function closestContour(reference:ContourInfo,candidates:ContourInfo[]){
  return candidates.reduce((best,item)=>{const score=(item.center.x-reference.center.x)**2+(item.center.y-reference.center.y)**2+Math.abs(Math.log((item.area+1)/(reference.area+1)))**2*2500;const bestScore=(best.center.x-reference.center.x)**2+(best.center.y-reference.center.y)**2+Math.abs(Math.log((best.area+1)/(reference.area+1)))**2*2500;return score<bestScore?item:best},candidates[0]).index;
}
function matchContours(from:ContourInfo[],to:ContourInfo[]){
  const candidates=from.flatMap(a=>to.filter(b=>a.hole===b.hole).map(b=>{const dx=a.center.x-b.center.x,dy=a.center.y-b.center.y,area=Math.abs(Math.log((a.area+1)/(b.area+1)));return {a:a.index,b:b.index,score:dx*dx+dy*dy+area*area*2500}})).sort((x,y)=>x.score-y.score);
  const usedA=new Set<number>(),usedB=new Set<number>(),pairs:{a:number|null;b:number|null}[]=[];
  for(const item of candidates)if(!usedA.has(item.a)&&!usedB.has(item.b)){usedA.add(item.a);usedB.add(item.b);pairs.push({a:item.a,b:item.b})}
  from.forEach(item=>{if(!usedA.has(item.index))pairs.push({a:item.index,b:null})});to.forEach(item=>{if(!usedB.has(item.index))pairs.push({a:null,b:item.index})});
  return pairs;
}
function dominantComponent(infos:ContourInfo[],components:number[]){const ids=[...new Set(components)],ranked=ids.map(id=>{const members=infos.filter(info=>components[info.index]===id&&!info.hole),usable=members.length?members:infos.filter(info=>components[info.index]===id);return {id,area:usable.reduce((sum,item)=>sum+item.area,0)}}).sort((a,b)=>b.area-a.area);return ranked[0]?.id??0}
function orderedWordComponents(infos:ContourInfo[],components:number[]){return [...new Set(components)].map(id=>{const members=infos.filter(info=>components[info.index]===id),outer=members.filter(info=>!info.hole).sort((a,b)=>b.area-a.area)[0]??members[0];return {id,x:outer?.center.x??0,members}}).sort((a,b)=>a.x-b.x)}
function componentBounds(infos:ContourInfo[],components:number[],component:number):PathBox{
  const coordinates=infos.filter(info=>components[info.index]===component).flatMap(info=>(info.d.match(numberPattern)||[]).map(Number)),xs=coordinates.filter((_,index)=>index%2===0),ys=coordinates.filter((_,index)=>index%2===1),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  return {x:minX,y:minY,width:Math.max(.001,maxX-minX),height:Math.max(.001,maxY-minY)};
}
function viewBoxValues(viewBox:string){const values=viewBox.trim().split(/[ ,]+/).map(Number);return values.length===4&&values.every(Number.isFinite)?values:[0,0,1,1]}
function viewBoxMatches(asset:VectorAsset,expected:number[]){const values=viewBoxValues(asset.viewBox);return values.length===expected.length&&values.every((value,index)=>Math.abs(value-expected[index])<.001)}
function isMattarNativeBoundary(from:VectorAsset,to:VectorAsset,targetState:number){return targetState===3&&componentCount(from)===6&&componentCount(to)===6&&viewBoxMatches(from,[0,0,2735.54,659.62])&&viewBoxMatches(to,[0,0,276.02,66.58])}
function isMattarMStructuralBoundary(from:VectorAsset,to:VectorAsset,targetState:number){return targetState===4&&componentCount(from)===6&&componentCount(to)===6&&viewBoxMatches(from,[0,0,276.02,66.58])&&viewBoxMatches(to,[0,0,280.7,67.07])}
function remapPathToViewBox(d:string,sourceViewBox:string,targetViewBox:string){
  const [sx,sy,sw,sh]=viewBoxValues(sourceViewBox),[tx,ty,tw,th]=viewBoxValues(targetViewBox),scale=Math.min(Math.abs(tw/sw)||1,Math.abs(th/sh)||1),offsetX=tx+(tw-sw*scale)/2-sx*scale,offsetY=ty+(th-sh*scale)/2-sy*scale;
  let coordinate=0;return d.replace(numberPattern,value=>{const number=Number(value),mapped=coordinate++%2===0?number*scale+offsetX:number*scale+offsetY;return Number.isInteger(mapped)?String(mapped):mapped.toFixed(5)})
}
function primaryMContour(asset:VectorAsset){
  if(componentCount(asset)!==6)return null;
  const holes=assetHoles(asset),components=assetComponents(asset),infos=asset.contours.map((d,index)=>contourInfo(d,index,holes[index])),first=orderedWordComponents(infos,components)[0];
  return first?.members.filter(member=>!member.hole).sort((a,b)=>b.area-a.area)[0]?.index??null
}
function replaceMFromReference(asset:VectorAsset,reference:VectorAsset){
  const targetIndex=primaryMContour(asset),referenceIndex=primaryMContour(reference);if(targetIndex===null||referenceIndex===null)return asset;
  const contours=[...asset.contours];contours[targetIndex]=remapPathToViewBox(reference.contours[referenceIndex],reference.viewBox,asset.viewBox);return {...asset,contours}
}
function matchWordContours(from:ContourInfo[],to:ContourInfo[],fromComponents:number[],toComponents:number[]){
  const source=orderedWordComponents(from,fromComponents),target=orderedWordComponents(to,toComponents);
  if(source.length!==6||target.length!==6)return null;
  return source.flatMap((component,index)=>[...component.members].sort((a,b)=>Number(a.hole)-Number(b.hole)||b.area-a.area).map(member=>{const candidates=target[index].members.filter(item=>item.hole===member.hole).sort((a,b)=>b.area-a.area);return {a:member.index,b:candidates[0]?.index??null}}));
}
function matchWithCarrier(from:ContourInfo[],to:ContourInfo[],fromComponents:number[],toComponents:number[],wordOrder=false){const fromCount=new Set(fromComponents).size,toCount=new Set(toComponents).size;if(wordOrder){const wordPairs=matchWordContours(from,to,fromComponents,toComponents);if(wordPairs)return wordPairs}const orderedNative=from.length===to.length&&from.every((info,index)=>Boolean(to[index])&&info.hole===to[index].hole&&fromComponents[index]===toComponents[index]);if(orderedNative)return from.map((_,index)=>({a:index,b:index}));if(fromCount>1&&toCount===1){const carrier=dominantComponent(from,fromComponents),carrierContours=from.filter(info=>fromComponents[info.index]===carrier);return matchContours(carrierContours,to)}if(fromCount===1&&toCount>1){const carrier=dominantComponent(to,toComponents),carrierContours=to.filter(info=>toComponents[info.index]===carrier),pairs=matchContours(from,carrierContours),used=new Set(pairs.flatMap(pair=>pair.b===null?[]:[pair.b]));return [...pairs,...to.filter(info=>!used.has(info.index)).map(info=>({a:null,b:info.index}))]}return matchContours(from,to)}
function nearestPoint(points:Point[],reference:Point){return points.reduce((best,point)=>((point.x-reference.x)**2+(point.y-reference.y)**2)<((best.x-reference.x)**2+(best.y-reference.y)**2)?point:best,points[0])}

function canonicalizeTransition(from:VectorAsset,to:VectorAsset,budget:number,scaleMode:ScaleMode,padding:number,autoAlign:boolean,targetState:number,reversals:Record<string,boolean>,offsets:Record<string,number>){
  const fromHoles=assetHoles(from),toHoles=assetHoles(to),fromComponents=assetComponents(from),toComponents=assetComponents(to),fromInfo=from.contours.map((d,i)=>contourInfo(d,i,fromHoles[i])),toInfo=to.contours.map((d,i)=>contourInfo(d,i,toHoles[i])),wordOrder=targetState<=4&&componentCount(from)===6&&componentCount(to)===6,pairs=matchWithCarrier(fromInfo,toInfo,fromComponents,toComponents,wordOrder);
  const lengths=pairs.map(pair=>Math.max(pair.a===null?0:fromInfo[pair.a].length,pair.b===null?0:toInfo[pair.b].length));
  const effectiveBudget=Math.max(budget,pairs.length*(wordOrder?180:120),480),allocation=allocatePoints(lengths,effectiveBudget),normalizeA=scaleNormalizer(from,scaleMode,padding),normalizeB=scaleNormalizer(to,scaleMode,padding);
  const a:Point[][]=[],b:Point[][]=[],groupsA:number[]=[],groupsB:number[]=[],holesA:boolean[]=[],holesB:boolean[]=[],absorbing:boolean[]=[],sourceIndices:(number|null)[]=[],targetIndices:(number|null)[]=[],nativeChannels:boolean[]=[],nativePaths:(NativePathChannel|null)[]=[],merging=componentCount(from)>1&&componentCount(to)===1,splitting=componentCount(from)===1&&componentCount(to)>1,direction=merging?"merge":splitting?"split":"pair",localGlyphInterpolation=wordOrder&&targetState>=3,isolatedNativeMotion=wordOrder&&isMattarNativeBoundary(from,to,targetState),structuralMMotion=wordOrder&&isMattarMStructuralBoundary(from,to,targetState),orderedSourceComponents=(isolatedNativeMotion||structuralMMotion)?orderedWordComponents(fromInfo,fromComponents):[],terminalWordComponent=isolatedNativeMotion?orderedSourceComponents.at(-1)?.id:null,primaryWordComponent=structuralMMotion?orderedSourceComponents[0]?.id:null,fromBoxCache=new Map<number,PathBox>(),toBoxCache=new Map<number,PathBox>();
  pairs.forEach((pair,channel)=>{
    const count=allocation[channel];
    const sourceIndex=pair.a??closestContour(toInfo[pair.b!],fromInfo),targetIndex=pair.b??closestContour(fromInfo[pair.a!],toInfo);
    const sourceComponent=fromComponents[sourceIndex],targetComponent=toComponents[targetIndex];
    if(localGlyphInterpolation&&!fromBoxCache.has(sourceComponent))fromBoxCache.set(sourceComponent,componentBounds(fromInfo,fromComponents,sourceComponent));
    if(localGlyphInterpolation&&!toBoxCache.has(targetComponent))toBoxCache.set(targetComponent,componentBounds(toInfo,toComponents,targetComponent));
    const sourceBox=localGlyphInterpolation?fromBoxCache.get(sourceComponent):undefined,targetBox=localGlyphInterpolation?toBoxCache.get(targetComponent):undefined,paired=pair.a!==null&&pair.b!==null?samplePairedContours(from.contours[sourceIndex],to.contours[targetIndex],count,wordOrder,sourceBox,targetBox,isolatedNativeMotion):null;
    let source=(paired?.source??sampleContour(from.contours[sourceIndex],count)).map(normalizeA);let target=(paired?.target??sampleContour(to.contours[targetIndex],count)).map(normalizeB);
    if(splitting&&pair.a===null){const carrier=sampleContour(from.contours[sourceIndex],Math.max(96,count)).map(normalizeA),join=nearestPoint(carrier,pointCenter(target));source=Array.from({length:count},()=>({...join}))}
    if(merging&&pair.b===null){const carrier=sampleContour(to.contours[targetIndex],Math.max(96,count)).map(normalizeB),join=nearestPoint(carrier,pointCenter(source));target=Array.from({length:count},()=>({...join}))}
    const sameTemplate=from.contours[sourceIndex].replace(numberPattern,"#")===to.contours[targetIndex].replace(numberPattern,"#"),key=`${targetState}:${pair.b??channel}`,manualReverse=!wordOrder&&Boolean(reversals[key]),manualOffset=wordOrder?0:(offsets[key]??0);let nativePath:NativePathChannel|null=null;
    if(wordOrder&&paired){
      if(structuralMMotion&&sourceComponent===primaryWordComponent&&sourceBox&&targetBox&&!fromHoles[sourceIndex])nativePath=structuralMPathChannel(from.contours[sourceIndex],to.contours[targetIndex],normalizeA,normalizeB,sourceBox,targetBox);
      else if(isolatedNativeMotion&&!sameTemplate&&sourceBox&&targetBox)nativePath=exactContourPathChannel(from.contours[sourceIndex],to.contours[targetIndex],normalizeA,normalizeB,sourceBox,targetBox,count);
      else if(isolatedNativeMotion&&sourceComponent===terminalWordComponent&&sourceBox&&targetBox&&!fromHoles[sourceIndex])nativePath=terminalRPathChannel(from.contours[sourceIndex],to.contours[targetIndex],normalizeA,normalizeB,sourceBox,targetBox);
      else if(isolatedNativeMotion&&sourceComponent===terminalWordComponent&&sourceBox&&targetBox){const [orderedSource,orderedTarget]=orderedNativeStrings(from.contours[sourceIndex],to.contours[targetIndex],sourceBox,targetBox);nativePath=nativePathChannel(orderedSource,orderedTarget,normalizeA,normalizeB,sourceBox,targetBox)}
      else nativePath=nativePathChannel(paired.sourceD,paired.targetD,normalizeA,normalizeB,sourceBox,targetBox);
    }
    if(manualReverse)target=[...target].reverse();target=rotatePoints(target,manualOffset);
    if(autoAlign&&!paired&&!manualReverse&&!manualOffset&&pair.a!==null&&pair.b!==null)target=(merging||splitting)?alignPointsByFeatures(target,source):alignPoints(target,source);
    a.push(source);b.push(target);groupsA.push(fromComponents[sourceIndex]);groupsB.push(toComponents[targetIndex]);holesA.push(pair.a===null?false:fromHoles[sourceIndex]);holesB.push(pair.b===null?false:toHoles[targetIndex]);absorbing.push(false);sourceIndices.push(pair.a);targetIndices.push(pair.b);nativeChannels.push(pair.a!==null&&pair.b!==null&&Boolean(paired));nativePaths.push(nativePath);
  });
  return {a,b,allocation,semantic:merging||splitting,groupsA,groupsB,holesA,holesB,absorbing,renderGroups:groupsB,direction,sourceIndices,targetIndices,nativeChannels,nativePaths:wordOrder?nativePaths:undefined};
}

function analyzeNativeTopology(assets:VectorAsset[]){
  const compatible=assets.length>1&&assets.every(asset=>asset.contours.length===assets[0].contours.length)&&assets[0].contours.every((contour,index)=>assets.every(asset=>asset.contours[index].replace(numberPattern,"#")===contour.replace(numberPattern,"#")));
  if(!compatible)return {compatible:false,templates:[] as string[],numbers:[] as number[][][],stable:[] as boolean[][],stableCount:0,totalCount:0};
  const templates=assets[0].contours,numbers=assets.map(asset=>asset.contours.map(d=>(d.match(numberPattern)||[]).map(Number)));
  const stable=templates.map((_,contour)=>numbers[0][contour].map((value,index)=>numbers.every(state=>state[contour][index]===value)));
  const stableCount=stable.flat().filter(Boolean).length,totalCount=stable.flat().length;
  return {compatible,templates,numbers,stable,stableCount,totalCount};
}

function analyzePair(from:VectorAsset,to:VectorAsset,transition?:TransitionMatrix){
  const fromCount=componentCount(from),toCount=componentCount(to),sameCount=fromCount===toCount;
  const channelCount=transition?.sourceIndices?.length??Math.max(from.contours.length,to.contours.length),fromGroups=assetComponents(from),toGroups=assetComponents(to),fromHoles=assetHoles(from),toHoles=assetHoles(to);
  const rows=Array.from({length:channelCount},(_,index)=>{
    const sourceIndex=transition?.sourceIndices?.[index]??(from.contours[index]?index:null),targetIndex=transition?.targetIndices?.[index]??(to.contours[index]?index:null),a=sourceIndex===null?undefined:from.contours[sourceIndex],b=targetIndex===null?undefined:to.contours[targetIndex],points=transition?.allocation[index]??0;
    const common={index,sourceIndex,targetIndex,sourceComponent:sourceIndex===null?null:fromGroups[sourceIndex],targetComponent:targetIndex===null?null:toGroups[targetIndex],sourceHole:sourceIndex===null?false:fromHoles[sourceIndex],targetHole:targetIndex===null?false:toHoles[targetIndex],points};
    if(!a||!b)return {...common,status:sourceIndex===null?"created" as const:"absorbed" as const,stable:0,confidence:42};
    const templateNative=a.replace(numberPattern,"#")===b.replace(numberPattern,"#"),orderedNative=sourceIndex===targetIndex&&common.sourceComponent===common.targetComponent&&common.sourceHole===common.targetHole,normalizedNative=Boolean(transition?.nativeChannels?.[index]);if(!templateNative&&!orderedNative&&!normalizedNative)return {...common,status:"structural" as const,stable:0,confidence:68};if(!templateNative)return {...common,status:"native" as const,stable:0,confidence:normalizedNative?98:95};
    const an=(a.match(numberPattern)||[]).map(Number),bn=(b.match(numberPattern)||[]).map(Number),stable=an.filter((value,i)=>value===bn[i]).length/an.length;
    return {...common,status:stable===1?"fixed" as const:"native" as const,stable,confidence:Math.round(90+stable*10)};
  });
  const allNative=sameCount&&rows.every(row=>row.status==="fixed"||row.status==="native");
  const mode=allNative?"Topologia nativa":sameCount?"Preservação estrutural":fromCount>toCount?`Fusão ${fromCount} → ${toCount}`:`Divisão ${fromCount} → ${toCount}`;
  const confidence=Math.round(rows.reduce((sum,row)=>sum+row.confidence,0)/rows.length);
  const attention=rows.filter(row=>row.status==="structural"||row.status==="created"||row.status==="absorbed").length;
  return {rows,mode,confidence,attention};
}
function relationStatusLabel(status:string){return status==="fixed"?"Imóvel":status==="native"?"Nativo":status==="structural"?"Estrutural":status==="created"?"Multiplicado":"Absorvido"}

function rebuildPath(template:string,numbers:number[]){let index=0;return template.replace(numberPattern,()=>Number.isInteger(numbers[index])?String(numbers[index++]):numbers[index++].toFixed(3))}

async function parseSvg(markup:string,name:string): Promise<VectorAsset> {
  const documentSvg = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = documentSvg.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || documentSvg.querySelector("parsererror")) throw new Error("SVG inválido ou corrompido.");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none";
  const imported = document.importNode(root, true) as unknown as SVGSVGElement;
  host.appendChild(imported);
  document.body.appendChild(host);
  try {
    const MorphSVGPlugin = await loadMorphEngine();
    const elements = Array.from(imported.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon")) as SVGElement[];
    if (!elements.length) throw new Error("Nenhuma geometria vetorial foi encontrada.");
    const primitives = elements.filter(el => el.tagName.toLowerCase() !== "path");
    if (primitives.length) MorphSVGPlugin.convertToPath(primitives as never, true);
    const paths = Array.from(imported.querySelectorAll("path"));
    const contours:string[]=[],components:number[]=[],holes:boolean[]=[];
    paths.forEach((path,pathIndex)=>{
      const raw = MorphSVGPlugin.getRawPath(path) as unknown as number[][];
      raw.forEach((subpath,subpathIndex)=>{
        const contour=MorphSVGPlugin.rawPathToString([subpath] as never);
        if(!contour)return;
        contours.push(contour);
        components.push(pathIndex);
        holes.push(subpathIndex>0);
      });
    });
    if (!contours.length) throw new Error("Os elementos não puderam ser convertidos em paths.");
    const viewBox = imported.getAttribute("viewBox") || `0 0 ${imported.getAttribute("width") || 470} ${imported.getAttribute("height") || 340}`;
    return { name: name.replace(/\.svg$/i, ""), contours, viewBox, sourceCount: paths.length, components, holes };
  } finally { host.remove(); }
}
async function readSvg(file:File){return parseSvg(await file.text(),file.name)}

type EaseName = "linear" | "smooth" | "gentle" | "sine" | "emphasis" | "expo" | "easeIn" | "easeOut" | "custom";
type BezierCurve=[number,number,number,number];
const DEFAULT_CURVE:BezierCurve=[.45,0,.55,1];
const easeNames:EaseName[]=["linear","smooth","gentle","sine","emphasis","expo","easeIn","easeOut","custom"];
const easingLabels:Record<EaseName,string>={linear:"Linear",smooth:"Suave",gentle:"Delicado",sine:"Senoidal",emphasis:"Ênfase",expo:"Intenso",easeIn:"Acelerar",easeOut:"Desacelerar",custom:"Personalizado"};
const easingCurves:Record<Exclude<EaseName,"custom">,BezierCurve>={linear:[0,0,1,1],smooth:[.45,0,.55,1],gentle:[.25,.1,.25,1],sine:[.37,0,.63,1],emphasis:[.65,0,.35,1],expo:[.87,0,.13,1],easeIn:[.42,0,1,1],easeOut:[0,0,.58,1]};
function isEaseName(value:unknown):value is EaseName{return typeof value==="string"&&easeNames.includes(value as EaseName)}
function isBezierCurve(value:unknown):value is BezierCurve{return Array.isArray(value)&&value.length===4&&value.every(item=>typeof item==="number"&&Number.isFinite(item))}
function normalizeEasings(value:unknown,length:number,fallback:EaseName="smooth"){const source=Array.isArray(value)?value:[];return Array.from({length},(_,index)=>isEaseName(source[index])?source[index]:fallback)}
function normalizeCurves(value:unknown,length:number,fallback:BezierCurve=DEFAULT_CURVE){const source=Array.isArray(value)?value:[];return Array.from({length},(_,index)=>[...(isBezierCurve(source[index])?source[index]:fallback)] as BezierCurve)}
function cubicBezierValue(t:number,[x1,y1,x2,y2]:BezierCurve){
  if(t<=0)return 0;if(t>=1)return 1;const sample=(u:number,a:number,b:number)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let low=0,high=1,u=t;for(let i=0;i<14;i++){const x=sample(u,x1,x2);if(x<t)low=u;else high=u;u=(low+high)/2}return sample(u,y1,y2);
}
const easeValue=(name:EaseName,t:number,custom:BezierCurve)=>cubicBezierValue(t,name==="custom"?custom:easingCurves[name]);

function timelineSegment(time:number,durations:number[]){
  const total=durations.reduce((sum,value)=>sum+value,0);let cursor=0;
  if(time>=total)return {index:Math.max(0,durations.length-1),start:Math.max(0,total-(durations.at(-1)??0)),local:1};
  for(let index=0;index<durations.length;index++){const duration=durations[index];if(time<cursor+duration)return {index,start:cursor,local:Math.max(0,Math.min(1,(time-cursor)/duration))};cursor+=duration}
  return {index:0,start:0,local:0};
}
function softenContour(points:Point[],amount:number){if(points.length<5||amount<=0)return points;let current=points;for(let pass=0;pass<2;pass++)current=current.map((point,index)=>{if(point.corner)return point;const before=current[(index-1+current.length)%current.length],after=current[(index+1)%current.length],average={x:(before.x+point.x*2+after.x)/4,y:(before.y+point.y*2+after.y)/4};return {x:point.x+(average.x-point.x)*amount,y:point.y+(average.y-point.y)*amount,corner:point.corner}});return current}
function interpolateTransition(matrix:TransitionMatrix,raw:number,ease:EaseName,custom:BezierCurve,roundness=0){
  const split=.46,hasMid=Boolean(matrix.mid),phase=hasMid?(raw<=split?0:1):0,local=hasMid?(phase===0?raw/split:(raw-split)/(1-split)):raw,t=easeValue(ease,local,custom),from=phase===1?matrix.mid!:matrix.a,to=phase===0&&hasMid?matrix.mid!:matrix.b;
  const bell=matrix.semantic?Math.sin(Math.PI*raw)**2:0,soften=bell*Math.max(0,Math.min(1,roundness/100))*.82,holes=from.map((_,index)=>Boolean(matrix.holesA?.[index]||matrix.holesB?.[index]));
  return from.map((contour,channel)=>{const channelT=phase===1&&matrix.absorbing?.[channel]?1-Math.pow(1-local,2.4):t,interpolated=contour.map((point,index)=>({x:point.x+(to[channel][index].x-point.x)*channelT,y:point.y+(to[channel][index].y-point.y)*channelT,corner:Boolean(point.corner||to[channel][index].corner)}));return holes[channel]?interpolated:softenContour(interpolated,soften)});
}
function svgDocument(paths:string,background?:string){return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">${background?`<rect width="1000" height="1000" fill="${background}"/>`:""}${paths}</svg>`}

function UnionComponents({contours,groups}:{contours:string[];holes?:boolean[];holeStrengths?:number[];groups:number[];maskId?:string;extent?:number}){return <g>{[...new Set(groups)].reverse().map(group=>{const d=contours.filter((_,index)=>groups[index]===group).join(" ");return <path key={group} d={d} className="morph-shape" fillRule="evenodd" clipRule="evenodd"/>})}</g>}
function unionComponentsSvgMarkup(contours:string[],_holes:boolean[],groups:number[],color:string){return [...new Set(groups)].reverse().map(group=>`<path d="${contours.filter((_,index)=>groups[index]===group).join(" ")}" fill="${color}" fill-rule="evenodd" clip-rule="evenodd"/>`).join("")}

export default function Home() {
  const [panel,setPanel]=useState("Composição"), [assets,setAssets]=useState<VectorAsset[]>(initialAssets), [durations,setDurations]=useState([2.5]);
  const [time,setTime]=useState(0), [playing,setPlaying]=useState(false), [loop,setLoop]=useState(false), [selected,setSelected]=useState(0);
  const [showPoints,setShowPoints]=useState(true), [autoAlign,setAutoAlign]=useState(true), [density,setDensity]=useState(500), [hydrated,setHydrated]=useState(false);
  const [scaleMode,setScaleMode]=useState<ScaleMode>("bounds"), [padding,setPadding]=useState(12), [easings,setEasings]=useState<EaseName[]>(["smooth"]), [customCurves,setCustomCurves]=useState<BezierCurve[]>([[...DEFAULT_CURVE]]), [zoom,setZoom]=useState(100),[exportColor,setExportColor]=useState("#181814"),[exportBackground,setExportBackground]=useState("#ffffff"),[semanticRoundness,setSemanticRoundness]=useState(55);
  const [exportDensity,setExportDensity]=useState(4000),[exportResolution,setExportResolution]=useState(2160),[exportFps,setExportFps]=useState(60),[exportQuality,setExportQuality]=useState<ExportQuality>("maximum"),[exportSvgLoop,setExportSvgLoop]=useState(false),[exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState(0);
  const [selectedContour,setSelectedContour]=useState(0),[mappingFilter,setMappingFilter]=useState<"all"|"attention"|"holes"|"confirmed">("all"),[reversals,setReversals]=useState<Record<string,boolean>>({}),[offsets,setOffsets]=useState<Record<string,number>>({}),[confirmed,setConfirmed]=useState<Record<string,boolean>>({});
  const [notice,setNotice]=useState(""); const input=useRef<HTMLInputElement>(null), inputAction=useRef<"add"|"replace">("add");
  const totalDuration=useMemo(()=>durations.reduce((a,b)=>a+b,0),[durations]);
  const segment=timelineSegment(time,durations);
  const activeEase=easings[segment.index]??"smooth",activeCustomCurve=customCurves[segment.index]??DEFAULT_CURVE;
  const compiledTransitions=useMemo<TransitionMatrix[]>(()=>{if(!hydrated||typeof document==="undefined")return [{a:[shapeA.map(([x,y])=>({x,y}))],b:[shapeB.map(([x,y])=>({x,y}))],allocation:[shapeA.length]}];return assets.slice(0,-1).map((asset,index)=>canonicalizeTransition(asset,assets[index+1],density,scaleMode,padding,autoAlign,index+1,reversals,offsets))},[hydrated,assets,density,scaleMode,padding,autoAlign,reversals,offsets]);
  const transitionMatrix=compiledTransitions[segment.index]??compiledTransitions[0];
  const geometryReady=hydrated&&compiledTransitions.length===durations.length;
  const nativeTopology=useMemo(()=>analyzeNativeTopology(assets),[assets]);
  const pairTopology=useMemo(()=>analyzeNativeTopology([assets[segment.index],assets[segment.index+1]]),[assets,segment.index]);
  const pairAnalysis=useMemo(()=>analyzePair(assets[segment.index],assets[segment.index+1],transitionMatrix),[assets,segment.index,transitionMatrix]);
  const pairTransform=useMemo(()=>hydrated&&pairTopology.compatible?scaleTransform(assets[segment.index],scaleMode,padding):"",[hydrated,pairTopology.compatible,assets,segment.index,scaleMode,padding]);
  const selectedRelation=pairAnalysis.rows[selectedContour]??pairAnalysis.rows[0],selectedRelationKey=selectedRelation?.index??0,targetRelationIndex=selectedRelation?.targetIndex??selectedRelationKey;
  const visibleRelations=pairAnalysis.rows.filter(row=>mappingFilter==="all"?true:mappingFilter==="attention"?(row.status==="structural"||row.status==="created"||row.status==="absorbed"):mappingFilter==="holes"?(row.sourceHole||row.targetHole):Boolean(confirmed[`${segment.index}:${row.index}`]));

  useEffect(()=>{if(!playing||!geometryReady)return;let raf=0,last=performance.now();const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;setTime(value=>{const next=value+dt;if(next<totalDuration)return next;if(loop)return 0;setPlaying(false);return totalDuration;});raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[playing,totalDuration,loop,geometryReady]);
  useEffect(()=>{let active=true;(async()=>{try{
    await loadMorphEngine();
    const raw=localStorage.getItem(PROJECT_KEY);
    if(raw){
      const saved=JSON.parse(raw);
      if(Array.isArray(saved.assets)&&saved.assets.length>=2){
        const savedDurations=Array.isArray(saved.durations)&&saved.durations.length===saved.assets.length-1?saved.durations:Array.from({length:saved.assets.length-1},()=>2.5),legacyEase=isEaseName(saved.ease)?saved.ease:"gentle",legacyCurve=isBezierCurve(saved.customCurve)?saved.customCurve:DEFAULT_CURVE;
        setAssets(saved.assets.map((asset:VectorAsset)=>asset.components&&asset.holes?asset:{...asset,...contourHierarchy(asset.contours)}));setDurations(savedDurations);setEasings(normalizeEasings(saved.easings,savedDurations.length,legacyEase));setCustomCurves(normalizeCurves(saved.customCurves,savedDurations.length,legacyCurve));setDensity(Math.max(250,saved.density??500));setScaleMode(saved.scaleMode??"bounds");setPadding(saved.padding??12);setLoop(saved.loop??false);setReversals(saved.reversals??{});setOffsets(saved.offsets??{});setConfirmed(saved.confirmed??{});setExportColor(saved.exportColor??"#181814");setExportBackground(saved.exportBackground??"#ffffff");setExportDensity(saved.exportDensity??4000);setExportResolution(saved.exportResolution??2160);setExportFps(saved.exportFps??60);setExportQuality(saved.exportQuality??"maximum");setExportSvgLoop(saved.exportSvgLoop??false);setSemanticRoundness(saved.semanticRoundness??55);setTime(0);return;
      }
    }
    let legacySaved:Record<string,unknown>|null=null;
    for(const key of LEGACY_PROJECT_KEYS){try{const legacy=localStorage.getItem(key);if(legacy){legacySaved=JSON.parse(legacy);break}}catch{/* preserva a revisão anterior e segue com os presets limpos */}}
    const sequence=[{url:"/presets/sequence-1.svg",name:"Estado 1"},{url:"/presets/sequence-2.svg",name:"Estado 2"},{url:"/presets/sequence-3.svg",name:"Estado 3"},{url:"/presets/sequence-4.svg",name:"Estado 4"},{url:"/presets/sequence-5.svg",name:"Estado 5"},{url:"/presets/sequence-6.svg",name:"Estado 6"},{url:"/presets/sequence-7.svg",name:"Estado 7"},{url:"/presets/sequence-8.svg",name:"Estado 8"}],reference=[{url:"/presets/ativo-8.svg",name:"Estado 1"},{url:"/presets/ativo-9.svg",name:"Estado 2"},{url:"/presets/ativo-10.svg",name:"Estado 3"}],[files,referenceFiles]=await Promise.all([Promise.all(sequence.map(async item=>{const response=await fetch(item.url);if(!response.ok)throw new Error("Falha ao carregar a nova sequência.");return parseSvg(await response.text(),item.name)})),Promise.all(reference.map(async item=>{const response=await fetch(item.url);if(!response.ok)throw new Error("Falha ao carregar a referência nativa.");return parseSvg(await response.text(),item.name)}))]),stateFour=replaceMFromReference(files[3],referenceFiles[0]),cleanAssets=[...referenceFiles,stateFour,...files.slice(4)],saved=legacySaved as ReturnType<typeof JSON.parse>|null,durationsNext=Array.isArray(saved?.durations)&&saved.durations.length===7?saved.durations:[1.4,1.4,1.4,1.4,1.4,1.4,1.6],densityNext=Math.max(250,saved?.density??500),scaleModeNext=saved?.scaleMode??"bounds",paddingNext=saved?.padding??12,legacyEaseNext=isEaseName(saved?.ease)?saved.ease:"smooth",legacyCurveNext=isBezierCurve(saved?.customCurve)?saved.customCurve:DEFAULT_CURVE,easingsNext=normalizeEasings(saved?.easings,durationsNext.length,legacyEaseNext),customCurvesNext=normalizeCurves(saved?.customCurves,durationsNext.length,legacyCurveNext),loopNext=saved?.loop??false,exportColorNext=saved?.exportColor??"#181814",exportBackgroundNext=saved?.exportBackground??"#ffffff",exportDensityNext=saved?.exportDensity??4000,exportResolutionNext=saved?.exportResolution??2160,exportFpsNext=saved?.exportFps??60,exportQualityNext=saved?.exportQuality??"maximum",exportSvgLoopNext=saved?.exportSvgLoop??false,roundnessNext=saved?.semanticRoundness??55;
    if(active){
      setAssets(cleanAssets);setDurations(durationsNext);setDensity(densityNext);setScaleMode(scaleModeNext);setPadding(paddingNext);setEasings(easingsNext);setCustomCurves(customCurvesNext);setLoop(loopNext);setReversals({});setOffsets({});setConfirmed({});setExportColor(exportColorNext);setExportBackground(exportBackgroundNext);setExportDensity(exportDensityNext);setExportResolution(exportResolutionNext);setExportFps(exportFpsNext);setExportQuality(exportQualityNext);setExportSvgLoop(exportSvgLoopNext);setSemanticRoundness(roundnessNext);setTime(0);setSelected(0);setPlaying(true);
      localStorage.setItem(PROJECT_KEY,JSON.stringify({assets:cleanAssets,durations:durationsNext,density:densityNext,scaleMode:scaleModeNext,padding:paddingNext,easings:easingsNext,customCurves:customCurvesNext,loop:loopNext,reversals:{},offsets:{},confirmed:{},exportColor:exportColorNext,exportBackground:exportBackgroundNext,exportDensity:exportDensityNext,exportResolution:exportResolutionNext,exportFps:exportFpsNext,exportQuality:exportQualityNext,exportSvgLoop:exportSvgLoopNext,semanticRoundness:roundnessNext}));
    }
  }catch{/* mantém o projeto padrão */}finally{if(active)setHydrated(true)}})();return()=>{active=false}},[]);

  const activeCurve=activeEase==="custom"?activeCustomCurve:easingCurves[activeEase];
  const currentContours=useMemo(()=>interpolateTransition(transitionMatrix,segment.local,activeEase,activeCustomCurve,semanticRoundness),[transitionMatrix,activeEase,activeCustomCurve,segment.local,semanticRoundness]);
  const currentGroups=transitionMatrix.renderGroups??transitionMatrix.groupsA??currentContours.map((_,index)=>index);
  const transitionNativeContours=useMemo(()=>interpolateNativePaths(transitionMatrix,segment.local,activeEase,activeCustomCurve,semanticRoundness),[transitionMatrix,segment.local,activeEase,activeCustomCurve,semanticRoundness]);
  const usesTransitionNative=Boolean(transitionNativeContours),usesTopologyNative=pairTopology.compatible&&!usesTransitionNative,displayContours=transitionNativeContours??currentContours.map(contour=>pointsPath([contour]));
  const nativeContours=useMemo(()=>{if(!pairTopology.compatible)return [];return pairTopology.templates.map((template,contour)=>{const values=pairTopology.numbers[0][contour].map((value,index)=>{if(pairTopology.stable[contour][index])return value;const target=pairTopology.numbers[1][contour][index],t=easeValue(activeEase,segment.local,activeCustomCurve);return value+(target-value)*t});return rebuildPath(template,values)})},[pairTopology,activeEase,activeCustomCurve,segment.local]);
  const visiblePoints=useMemo(()=>{if(showPoints&&transitionNativeContours&&isMattarNativeBoundary(assets[segment.index],assets[segment.index+1],segment.index+1))return transitionNativeContours.flatMap((contour,index)=>sampleContour(contour,Math.min(120,transitionMatrix.allocation[index]??48)));return currentContours.flat()},[showPoints,transitionNativeContours,assets,segment.index,transitionMatrix.allocation,currentContours]);
  const stateTimes=useMemo(()=>durations.reduce<number[]>((times,d)=>[...times,times[times.length-1]+d],[0]),[durations]);

  async function loadOfficialIdentity(){
    try{
      setPlaying(false);
      setNotice("Carregando os vetores oficiais do LABMATTAR…");
      const names=["M.svg",...Array.from({length:9},(_,i)=>`vaso_${String(i+1).padStart(2,"0")}.svg`)];
      const states:VectorAsset[]=[];
      for(const name of names){
        const response=await fetch(`/identidade/${name}`);
        if(!response.ok)throw new Error(`Não foi possível carregar ${name}.`);
        states.push(await parseSvg(await response.text(),name.replace(".svg","").replaceAll("_"," ")));
      }
      setAssets(states);
      setDurations(Array(states.length-1).fill(2.5));
      setEasings(Array(states.length-1).fill("smooth"));
      setCustomCurves(Array.from({length:states.length-1},()=>[...DEFAULT_CURVE] as BezierCurve));
      setReversals({});setOffsets({});setConfirmed({});setSelected(0);setTime(0);
      setScaleMode("bounds");setPadding(14);setPanel("Composição");
      setNotice("M e os nove vasos carregados. Revise as correspondências antes de exportar.");
    }catch(error){setNotice(error instanceof Error?error.message:"Falha ao abrir vetores oficiais.")}
  }
  function openImport(action:"add"|"replace"){inputAction.current=action;input.current?.click()}
  async function importFiles(files:FileList|null){if(!files?.length)return;try{setNotice("Lendo e normalizando SVGs…");const loaded=[] as VectorAsset[];for(const file of Array.from(files)){if(file.name.toLowerCase().endsWith(".svg"))loaded.push(await readSvg(file));}if(!loaded.length)throw new Error("Nenhum SVG válido foi selecionado.");if(inputAction.current==="replace"){setAssets(current=>current.map((a,i)=>i===selected?loaded[0]:a));}else{setAssets(current=>[...current,...loaded]);setDurations(current=>[...current,...loaded.map(()=>2.5)]);setEasings(current=>[...current,...loaded.map(()=>current.at(-1)??"smooth")]);setCustomCurves(current=>[...current,...loaded.map(()=>[...(current.at(-1)??DEFAULT_CURVE)] as BezierCurve)]);setSelected(assets.length);setTime(totalDuration);}setNotice(`${loaded.length} estado${loaded.length>1?"s":""} adicionado${loaded.length>1?"s":""}.`);}catch(error){setNotice(error instanceof Error?error.message:"Falha na importação.")}finally{if(input.current)input.current.value="";setTimeout(()=>setNotice(""),4000)}}
  function goState(index:number){setPlaying(false);setSelected(index);setTime(stateTimes[index]??0)}
  function selectRelation(side:"source"|"target",contourIndex:number){const row=pairAnalysis.rows.find(item=>(side==="source"?item.sourceIndex:item.targetIndex)===contourIndex);if(row)setSelectedContour(row.index)}
  function previewRelation(local:number){setPlaying(false);setTime(segment.start+durations[segment.index]*Math.max(0,Math.min(1,local)))}
  function resetRelation(){const targetKey=`${segment.index+1}:${targetRelationIndex}`;setReversals(current=>({...current,[targetKey]:false}));setOffsets(current=>({...current,[targetKey]:0}));setConfirmed(current=>({...current,[`${segment.index}:${selectedRelationKey}`]:false}));setNotice("A relação selecionada voltou ao cálculo automático.");setTimeout(()=>setNotice(""),2500)}
  function updateSegmentEase(value:EaseName){setEasings(current=>current.map((item,index)=>index===segment.index?value:item))}
  function updateSegmentCurvePoint(pointIndex:number,value:number){setCustomCurves(current=>current.map((curve,index)=>index===segment.index?curve.map((item,i)=>i===pointIndex?value:item) as BezierCurve:curve))}
  function copySegmentMotionToAll(){setEasings(Array.from({length:durations.length},()=>activeEase));setCustomCurves(Array.from({length:durations.length},()=>[...activeCustomCurve] as BezierCurve));setNotice("Easing e curva copiados para todos os trechos.");setTimeout(()=>setNotice(""),2500)}
  function resetSegmentMotion(){setEasings(current=>current.map((item,index)=>index===segment.index?"smooth":item));setCustomCurves(current=>current.map((curve,index)=>index===segment.index?[...DEFAULT_CURVE]:curve));setNotice(`Trecho ${segment.index+1} voltou ao easing suave.`);setTimeout(()=>setNotice(""),2500)}
  function moveState(index:number,delta:number){const next=index+delta;if(next<0||next>=assets.length)return;setAssets(current=>{const copy=[...current];[copy[index],copy[next]]=[copy[next],copy[index]];return copy});setSelected(next);setNotice("Ordem dos estados atualizada.")}
  function removeState(){if(assets.length<=2){setNotice("A timeline precisa manter pelo menos dois estados.");return}const removedTransition=selected===0?0:Math.min(selected,durations.length-1);setAssets(current=>current.filter((_,i)=>i!==selected));setDurations(current=>current.filter((_,i)=>i!==removedTransition));setEasings(current=>current.filter((_,i)=>i!==removedTransition));setCustomCurves(current=>current.filter((_,i)=>i!==removedTransition));setSelected(Math.max(0,selected-1));setTime(0)}
  function saveProject(){localStorage.setItem(PROJECT_KEY,JSON.stringify({assets,durations,density,scaleMode,padding,easings,customCurves,loop,reversals,offsets,confirmed,exportColor,exportBackground,exportDensity,exportResolution,exportFps,exportQuality,exportSvgLoop,semanticRoundness}));setNotice("Projeto, easings e correspondências salvos neste navegador.");setTimeout(()=>setNotice(""),2500)}
  function download(content:BlobPart,name:string,type:string){const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function downloadProject(){download(JSON.stringify({version:8,assets,durations,density,scaleMode,padding,easings,customCurves,loop,reversals,offsets,confirmed,exportColor,exportBackground,exportDensity,exportResolution,exportFps,exportQuality,exportSvgLoop,semanticRoundness},null,2),"matriz-vetorial.json","application/json")}
  function compileForExport(){return assets.slice(0,-1).map((asset,index)=>canonicalizeTransition(asset,assets[index+1],exportDensity,scaleMode,padding,autoAlign,index+1,reversals,offsets))}
  function frameGeometry(at:number,transitions:TransitionMatrix[]){const active=at>=totalDuration?{index:Math.max(0,transitions.length-1),local:1}:timelineSegment(at,durations),matrixAt=transitions[active.index]??transitions[0],frameEase=easings[active.index]??"smooth",frameCurve=customCurves[active.index]??DEFAULT_CURVE,contours=interpolateNativePaths(matrixAt,active.local,frameEase,frameCurve,semanticRoundness)??interpolateTransition(matrixAt,active.local,frameEase,frameCurve,semanticRoundness).map(contour=>pointsPath([contour])),groups=matrixAt.renderGroups??matrixAt.groupsA??contours.map((_,index)=>index);return {contours,groups}}
  function frameMarkup(at:number,transitions:TransitionMatrix[],background?:string){const {contours,groups}=frameGeometry(at,transitions);return svgDocument(unionComponentsSvgMarkup(contours,[],groups,exportColor),background)}
  const exportBitrate=useMemo(()=>{const base=exportResolution>=3800?90_000_000:exportResolution>=2100?48_000_000:18_000_000,multiplier=exportQuality==="high"?.72:exportQuality==="master"?1.45:1;return Math.round(base*multiplier*(exportFps/60))},[exportResolution,exportFps,exportQuality]);
  const estimatedExportMb=useMemo(()=>Math.max(1,Math.round(exportBitrate*totalDuration/8/1_000_000)),[exportBitrate,totalDuration]);
  function exportStaticSvg(){try{setNotice("Calculando SVG em precisão máxima…");const transitions=compileForExport();download(frameMarkup(time,transitions),`matriz-vetorial-frame-${time.toFixed(2)}s.svg`,"image/svg+xml");setNotice(`SVG vetorial exportado com ${exportDensity} pontos.`)}catch(error){setNotice(error instanceof Error?error.message:"Falha ao exportar SVG.")}finally{setTimeout(()=>setNotice(""),3500)}}
  function exportAnimatedSvg(){
    try{
      setNotice("Compilando SVG animado em precisão máxima…");const transitions=compileForExport(),payload=JSON.stringify({transitions,durations,easings,curves:customCurves,color:exportColor,total:totalDuration,roundness:semanticRoundness,loop:exportSvgLoop});
      const runtime=`const D=${payload};const NS='http://www.w3.org/2000/svg',stage=document.getElementById('vector-stage');let segment=-1,groupNodes=new Map(),channelPaths=[];function bez(t,c){if(t<=0)return 0;if(t>=1)return 1;const s=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;let l=0,h=1,u=t;for(let i=0;i<14;i++){s(u,c[0],c[2])<t?l=u:h=u;u=(l+h)/2}return s(u,c[1],c[3])}function tangent(a,b,c){if(b.corner)return{x:0,y:0};const x=c.x-a.x,y=c.y-a.y,L=Math.hypot(x,y),A=Math.hypot(b.x-a.x,b.y-a.y),B=Math.hypot(c.x-b.x,c.y-b.y);if(L<1e-6||A<1e-6||B<1e-6)return{x:0,y:0};const H=2*A*B/(A+B),M=Math.min(H*.92,Math.min(A,B)*1.35);return{x:x/L*M,y:y/L*M}}function path(P){let d='M'+P[0].x.toFixed(3)+','+P[0].y.toFixed(3);for(let i=0;i<P.length;i++){const a=P[(i-1+P.length)%P.length],b=P[i],c=P[(i+1)%P.length],e=P[(i+2)%P.length],u=tangent(a,b,c),v=tangent(b,c,e);d+=' C'+(b.x+u.x/3).toFixed(3)+','+(b.y+u.y/3).toFixed(3)+' '+(c.x-v.x/3).toFixed(3)+','+(c.y-v.y/3).toFixed(3)+' '+c.x.toFixed(3)+','+c.y.toFixed(3)}return d+' Z'}function soft(P,a){for(let pass=0;pass<2;pass++)P=P.map((p,i)=>{if(p.corner)return p;const b=P[(i-1+P.length)%P.length],n=P[(i+1)%P.length],x=(b.x+p.x*2+n.x)/4,y=(b.y+p.y*2+n.y)/4;return{x:p.x+(x-p.x)*a,y:p.y+(y-p.y)*a,corner:p.corner}});return P}function native(n,q){const z=n.boxA&&n.boxB?{x:n.boxA.x+(n.boxB.x-n.boxA.x)*q,y:n.boxA.y+(n.boxB.y-n.boxA.y)*q,width:n.boxA.width+(n.boxB.width-n.boxA.width)*q,height:n.boxA.height+(n.boxB.height-n.boxA.height)*q}:null;let d=n.parts[0];for(let i=0;i<n.a.length;i++){const v=n.a[i]+(n.b[i]-n.a[i])*q,p=z?(i%2===0?z.x+v*z.width:z.y+v*z.height):v;d+=p.toFixed(3)+n.parts[i+1]}return d}function setup(m){stage.replaceChildren();groupNodes=new Map();channelPaths=[];const map=m.renderGroups||m.groupsA||m.a.map((_,i)=>i);for(const g of [...new Set(map)].reverse()){const p=document.createElementNS(NS,'path');p.setAttribute('fill',D.color);p.setAttribute('fill-rule','evenodd');p.setAttribute('clip-rule','evenodd');stage.appendChild(p);groupNodes.set(g,p)}}function locate(t){if(t>=D.total)return{i:D.transitions.length-1,raw:1};let c=0;for(let i=0;i<D.durations.length;i++){if(t<c+D.durations[i])return{i,raw:(t-c)/D.durations[i]};c+=D.durations[i]}return{i:D.transitions.length-1,raw:1}}const start=performance.now();function draw(now){const elapsed=(now-start)/1000,finished=!D.loop&&elapsed>=D.total,t=D.loop?elapsed%D.total:Math.min(elapsed,D.total),active=locate(t),i=active.i,raw=active.raw,m=D.transitions[i],ease=D.easings[i]||'smooth',curve=ease==='custom'?(D.curves[i]||[.45,0,.55,1]):${JSON.stringify(easingCurves)}[ease],q=bez(raw,curve),round=m.semantic?Math.sin(Math.PI*raw)**2*(D.roundness/100)*.82:0;if(i!==segment){segment=i;setup(m)}const map=m.renderGroups||m.groupsA||m.a.map((_,j)=>j);m.a.forEach((A,j)=>{const B=m.b[j];let P=A.map((p,k)=>({x:p.x+(B[k].x-p.x)*q,y:p.y+(B[k].y-p.y)*q,corner:Boolean(p.corner||B[k].corner)}));if(round&&!m.holesA?.[j]&&!m.holesB?.[j])P=soft(P,round);channelPaths[j]=path(P)});m.nativePaths?.forEach((n,j)=>{if(n)channelPaths[j]=native(n,q)});groupNodes.forEach((node,g)=>node.setAttribute('d',channelPaths.filter((_,j)=>map[j]===g).join(' ')));if(!finished)requestAnimationFrame(draw)}requestAnimationFrame(draw);`;
      download(`${svgDocument(`<g id="vector-stage"></g><script><![CDATA[${runtime}]]></script>`)}`,"matriz-vetorial-animada-max.svg","image/svg+xml");setNotice(exportSvgLoop?`SVG animado exportado com ${exportDensity} pontos e ciclo contínuo.`:`SVG animado exportado com ${exportDensity} pontos e encerramento exato no estado 8.`)
    }catch(error){setNotice(error instanceof Error?error.message:"Falha ao exportar SVG animado.")}finally{setTimeout(()=>setNotice(""),4000)}
  }
  async function exportMp4(){
    if(exporting)return;setPlaying(false);setExporting(true);setExportProgress(0);
    try{
      const Encoder=window.VideoEncoder;if(!Encoder)throw new Error("A exportação MP4 requer Chrome ou Edge atualizado.");
      setNotice("Preparando renderização MP4…");const transitions=compileForExport(),width=exportResolution,height=exportResolution,frames=Math.max(2,Math.round(totalDuration*exportFps)),bitrate=exportBitrate,level=exportResolution>=3800?"3C":"33";
      const preferred={codec:`avc1.6400${level}`,width,height,bitrate,framerate:exportFps,hardwareAcceleration:"prefer-hardware" as const},support=await Encoder.isConfigSupported(preferred),fallback={...preferred,codec:`avc1.4d00${level}`,hardwareAcceleration:"no-preference" as const},fallbackSupport=support.supported?support:await Encoder.isConfigSupported(fallback);if(!fallbackSupport.supported)throw new Error("Esta resolução não é suportada neste navegador. Tente 2160 × 2160.");const config=support.supported?preferred:fallback;
      let encoderFailure:Error|null=null;const target=new ArrayBufferTarget(),muxer=new Muxer({target,video:{codec:"avc",width,height},fastStart:"in-memory"}),encoder=new Encoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:error=>{encoderFailure=error}});encoder.configure(config);
      const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{alpha:false,colorSpace:"srgb"});if(!context)throw new Error("Não foi possível iniciar a tela de exportação.");
      for(let frameIndex=0;frameIndex<frames;frameIndex++){
        if(encoderFailure)throw encoderFailure;const frameTime=frameIndex===frames-1?totalDuration:frameIndex*totalDuration/(frames-1),{contours,groups}=frameGeometry(frameTime,transitions);context.setTransform(1,0,0,1,0,0);context.fillStyle=exportBackground;context.fillRect(0,0,width,height);context.scale(width/1000,height/1000);context.fillStyle=exportColor;for(const group of [...new Set(groups)].reverse()){const d=contours.filter((_,index)=>groups[index]===group).join(" ");context.fill(new Path2D(d),"evenodd")}
        const videoFrame=new VideoFrame(canvas,{timestamp:Math.round(frameIndex*1_000_000/exportFps),duration:Math.round(1_000_000/exportFps)});encoder.encode(videoFrame,{keyFrame:frameIndex%(exportFps*2)===0});videoFrame.close();if(frameIndex%8===0){setExportProgress(Math.round((frameIndex+1)/frames*100));await new Promise(requestAnimationFrame)}
      }
      await encoder.flush();if(encoderFailure)throw encoderFailure;encoder.close();muxer.finalize();download(new Blob([target.buffer],{type:"video/mp4"}),`matriz-vetorial-${exportResolution}px-${exportFps}fps-${exportQuality}.mp4`,"video/mp4");setExportProgress(100);setNotice(`MP4 exportado em ${exportResolution} × ${exportResolution}, ${exportFps} fps, com o estado 8 completo.`)
    }catch(error){setNotice(error instanceof Error?error.message:"Falha ao exportar MP4.")}finally{setExporting(false);setTimeout(()=>setNotice(""),5000)}
  }

  return <main className="app-shell" aria-busy={!geometryReady} data-panel={panel}>
    <header className="topbar"><div className="brand"><span className="brand-mark">M</span><span>LABMATTAR <i>/ MATRIZ VETORIAL</i></span></div><nav className="panel-tabs">{panels.map(item=><button key={item} className={panel===item?"active":""} onClick={()=>setPanel(item)}>{item}</button>)}</nav><div className="top-actions"><a className="manual-link" href="/manual.html">Manual</a><button className="quiet" onClick={loadOfficialIdentity}>M + 9 vasos</button><button className="quiet" onClick={saveProject}>Salvar</button><button className="primary" onClick={()=>setPanel("Exportar")}>Exportar</button></div></header>
    <section className="workspace">
      <aside className="rail left-rail"><div className="rail-head"><span>Estados · {assets.length}</span><button onClick={()=>openImport("add")}>＋</button></div><input ref={input} type="file" multiple accept="image/svg+xml,.svg" hidden onChange={e=>importFiles(e.target.files)}/>
        {assets.map((asset,index)=><div key={`${asset.name}-${index}`} className={`asset-card ${selected===index?"selected":""}`}><button className="asset-main" onClick={()=>goState(index)}><span className={`thumb ${index%2?"thumb-b":"thumb-a"}`}>{String(index+1).padStart(2,"0")}</span><span><b>{asset.name}</b><small>{componentCount(asset)} componente{componentCount(asset)===1?"":"s"} · {assetHoles(asset).filter(Boolean).length} vazado{assetHoles(asset).filter(Boolean).length===1?"":"s"}</small></span></button><span className="asset-order"><button onClick={()=>moveState(index,-1)}>↑</button><button onClick={()=>moveState(index,1)}>↓</button></span></div>)}
        <button className="import-card" onClick={()=>openImport("add")}><strong>＋ Adicionar SVGs</strong><span>Seleção múltipla habilitada</span></button><div className="library-label">Trecho ativo</div><button className="layer-row"><span className="layer-dot d0"></span>{assets[segment.index]?.name}<small>origem</small></button><button className="layer-row"><span className="layer-dot d1"></span>{assets[segment.index+1]?.name}<small>destino</small></button>
      </aside>
      <section className="stage-wrap"><div className="stage-toolbar"><div><button className="tool active">MORPH</button></div><span>{panel} / {segment.index+1} → {segment.index+2}</span><div><button className="zoom" onClick={()=>setZoom(z=>Math.max(40,z-10))}>−</button><b>{zoom}%</b><button className="zoom" onClick={()=>setZoom(z=>Math.min(140,z+10))}>＋</button></div></div>
        {panel==="Correspondência"?<div className="correspondence-stage">
          <div className="analysis-banner"><span><small>ESTRATÉGIA</small><b>{pairAnalysis.mode}</b></span><span><small>CONFIANÇA</small><b>{pairAnalysis.confidence}%</b></span><span><small>RELAÇÕES</small><b>{pairAnalysis.rows.length}</b></span><span className={pairAnalysis.attention?"has-attention":""}><small>REVISAR</small><b>{pairAnalysis.attention}</b></span><label className="correspondence-scrub"><small>PRÉVIA DO TRECHO · {Math.round(segment.local*100)}%</small><input type="range" min="0" max="1" step="0.001" value={segment.local} onChange={event=>previewRelation(+event.target.value)}/></label></div>
          <div className="compare-grid"><div className="compare-pane"><header><b>{assets[segment.index].name}</b><small>Origem · clique em uma forma</small></header><svg viewBox={assets[segment.index].viewBox}>{assets[segment.index].contours.map((d,i)=>{const row=pairAnalysis.rows.find(item=>item.sourceIndex===i);return <path key={i} d={d} onClick={()=>selectRelation("source",i)} className={`compare-path ${selectedRelation?.sourceIndex===i?"selected":""} status-${row?.status??"unmapped"}`}/>})}</svg></div>
            <div className="mapping-column"><div className="mapping-filters"><button className={mappingFilter==="all"?"active":""} onClick={()=>setMappingFilter("all")}>Todas</button><button className={mappingFilter==="attention"?"active":""} onClick={()=>setMappingFilter("attention")}>Revisar</button><button className={mappingFilter==="holes"?"active":""} onClick={()=>setMappingFilter("holes")}>Vazados</button><button className={mappingFilter==="confirmed"?"active":""} onClick={()=>setMappingFilter("confirmed")}>Confirmadas</button></div><div className="mapping-list">{visibleRelations.length?visibleRelations.map(row=><button key={row.index} className={`mapping-row ${selectedRelationKey===row.index?"selected":""} status-${row.status}`} onClick={()=>setSelectedContour(row.index)}><span>{row.sourceIndex===null?"—":`O${String(row.sourceIndex+1).padStart(2,"0")}`}</span><i></i><span>{row.targetIndex===null?"—":`D${String(row.targetIndex+1).padStart(2,"0")}`}</span><em>{relationStatusLabel(row.status)}</em></button>):<p className="empty-filter">Nenhuma relação neste filtro.</p>}</div></div>
            <div className="compare-pane"><header><b>{assets[segment.index+1].name}</b><small>Destino · clique em uma forma</small></header><svg viewBox={assets[segment.index+1].viewBox}>{assets[segment.index+1].contours.map((d,i)=>{const row=pairAnalysis.rows.find(item=>item.targetIndex===i);return <path key={i} d={d} onClick={()=>selectRelation("target",i)} className={`compare-path ${selectedRelation?.targetIndex===i?"selected":""} status-${row?.status??"unmapped"}`}/>})}</svg></div></div>
          <div className="mapping-actions"><span className="relation-summary"><b>{selectedRelation?.sourceIndex===null?"Multiplicação":selectedRelation?.targetIndex===null?"Absorção":`Contorno ${String((selectedRelation?.sourceIndex??0)+1).padStart(2,"0")} → ${String((selectedRelation?.targetIndex??0)+1).padStart(2,"0")}`}</b><small>{relationStatusLabel(selectedRelation?.status??"structural")} · {selectedRelation?.points??0} pontos · {selectedRelation?.confidence??0}% confiança</small></span><button className={confirmed[`${segment.index}:${selectedRelationKey}`]?"confirmed":""} onClick={()=>setConfirmed(current=>({...current,[`${segment.index}:${selectedRelationKey}`]:!current[`${segment.index}:${selectedRelationKey}`]}))}>✓ Confirmar</button><button className={reversals[`${segment.index+1}:${targetRelationIndex}`]?"confirmed":""} onClick={()=>setReversals(current=>({...current,[`${segment.index+1}:${targetRelationIndex}`]:!current[`${segment.index+1}:${targetRelationIndex}`]}))}>⇄ Direção</button><button onClick={()=>setOffsets(current=>({...current,[`${segment.index+1}:${targetRelationIndex}`]:(current[`${segment.index+1}:${targetRelationIndex}`]??0)-1}))}>− Início</button><b className="offset-readout">{offsets[`${segment.index+1}:${targetRelationIndex}`]??0}</b><button onClick={()=>setOffsets(current=>({...current,[`${segment.index+1}:${targetRelationIndex}`]:(current[`${segment.index+1}:${targetRelationIndex}`]??0)+1}))}>＋ Início</button><button onClick={resetRelation}>↺ Automático</button></div>
        </div>:<div className="stage"><svg viewBox="0 0 1000 1000" className="vector-canvas" style={{transform:`scale(${zoom/100})`}} preserveAspectRatio="xMidYMid meet"><g className="render-layer native-layer" opacity={usesTopologyNative?1:0} aria-hidden={!usesTopologyNative} transform={pairTransform}><UnionComponents contours={nativeContours} groups={usesTopologyNative?assetComponents(assets[segment.index]):[]} /><path d={usesTopologyNative?assets[segment.index].contours.join(" "):""} className="ghost-path"/></g><g className="render-layer sampled-layer" opacity={usesTopologyNative?0:1} aria-hidden={usesTopologyNative}><UnionComponents contours={displayContours} groups={currentGroups}/>{transitionMatrix.a.map((contour,index)=><path key={`ghost-${index}`} d={pointsPath([contour])} className="ghost-path"/>)}{showPoints&&visiblePoints.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" className="point"/>)}</g></svg><div className="stage-note"><span className="pulse"></span><b>{usesTransitionNative?"Morph nativo seletivo":pairAnalysis.mode}</b><small>{usesTransitionNative?"Bézier compatível + cálculo polido":usesTopologyNative?`${pairTopology.stableCount}/${pairTopology.totalCount} parâmetros congelados`:transitionMatrix.allocation.join(" + ")}</small></div></div>}
        <div className="transport"><button onClick={()=>{setPlaying(false);setTime(0)}} title="Ir ao início">│◀</button><button onClick={()=>goState(Math.max(0,segment.index))} title="Keyframe anterior">◀◆</button><button className={`play ${playing?"is-playing":""}`} onClick={()=>setPlaying(!playing)} aria-label={playing?"Pausar timeline":"Reproduzir timeline"}><span>{playing?"Ⅱ":"▶"}</span>{playing?"PAUSAR":"REPRODUZIR"}</button><button onClick={()=>goState(Math.min(assets.length-1,segment.index+1))} title="Próximo keyframe">◆▶</button><button onClick={()=>{setPlaying(false);setTime(totalDuration)}} title="Ir ao final">▶│</button><code>{time.toFixed(2)}s</code><input type="range" min="0" max={totalDuration} step="0.001" value={time} onChange={e=>{setPlaying(false);setTime(+e.target.value)}}/><code>{totalDuration.toFixed(2)}s</code></div>
        <div className="timeline"><div className="timeline-labels"><span>ESTADOS</span><span>TRANSIÇÕES</span></div><div className="tracks"><div className="ruler">{stateTimes.map((t,i)=><i key={i}>{t.toFixed(1)}</i>)}</div><div className="track dynamic-track">{durations.map((d,i)=><div key={i} className={`timeline-segment ${segment.index===i?"active":""}`} style={{left:`${stateTimes[i]/totalDuration*100}%`,width:`${d/totalDuration*100}%`}} onClick={()=>{setSelected(i);setTime(stateTimes[i]+d/2)}}></div>)}{stateTimes.map((t,i)=><button key={i} className={`keyframe ${selected===i?"selected":""}`} style={{left:`${t/totalDuration*100}%`}} onClick={()=>goState(i)} title={assets[i]?.name}></button>)}</div><div className="track appearance">{durations.map((d,i)=><button key={i} className={`ease-chip ${segment.index===i?"active":""}`} style={{left:`${(stateTimes[i]+d/2)/totalDuration*100}%`}} onClick={()=>{setPlaying(false);setSelected(i);setTime(stateTimes[i]+d/2)}} title={`Editar easing do trecho ${i+1}`}>{easingLabels[easings[i]??"smooth"]}</button>)}</div><div className="playhead" style={{left:`${time/totalDuration*100}%`}}><span/></div></div></div>
      </section>
      <aside className="rail inspector"><div className="inspector-title"><span>Propriedades</span><em>{panel==="Correspondência"?`Relação ${selectedRelationKey+1}`:`Estado ${selected+1}`}</em></div>{panel==="Exportar"?<><section className="property export-panel"><h3>Preservar projeto</h3><p>{assets.length} estados · {totalDuration.toFixed(1)} segundos · {nativeTopology.compatible?"topologia nativa":`${density} pontos`}.</p><button className="primary export-button" onClick={()=>{saveProject();downloadProject()}}>Salvar e baixar projeto</button></section><section className="property export-panel"><h3>SVG vetorial</h3><label>Cor da forma<input className="color-input" type="color" value={exportColor} onChange={e=>setExportColor(e.target.value)}/></label><label>Precisão da curva<select value={exportDensity} onChange={e=>setExportDensity(+e.target.value)}><option value="1000">Alta · 1.000 pontos</option><option value="2000">Superior · 2.000 pontos</option><option value="4000">Máxima · 4.000 pontos</option><option value="8000">Arquivo mestre · 8.000 pontos</option></select></label><Toggle label="Repetir SVG animado" value={exportSvgLoop} change={setExportSvgLoop}/><div className="export-readout"><span><small>Encerramento</small><b>{exportSvgLoop?"Loop contínuo":"Para no estado 8"}</b></span><span><small>Fundo</small><b>Transparente</b></span></div><button className="primary export-button" onClick={exportAnimatedSvg}>Baixar SVG animado</button><button className="full-button" onClick={exportStaticSvg}>Baixar frame vetorial</button><p>Vetores, vazados, easing e correspondências são preservados. Sem repetição, o arquivo termina exatamente no estado 8.</p></section><section className="property export-panel"><h3>Vídeo MP4</h3><label>Resolução<select value={exportResolution} onChange={e=>setExportResolution(+e.target.value)}><option value="1080">Alta · 1080 × 1080</option><option value="2160">Ultra · 2160 × 2160</option><option value="3840">Máxima · 3840 × 3840</option></select></label><label>Taxa de quadros<select value={exportFps} onChange={e=>setExportFps(+e.target.value)}><option value="24">Cinema · 24 fps</option><option value="30">Vídeo · 30 fps</option><option value="60">Fluido · 60 fps</option></select></label><label>Qualidade H.264<select value={exportQuality} onChange={e=>setExportQuality(e.target.value as ExportQuality)}><option value="high">Alta · arquivo menor</option><option value="maximum">Máxima · recomendado</option><option value="master">Mestre · bitrate elevado</option></select></label><label>Cor do fundo<input className="color-input" type="color" value={exportBackground} onChange={e=>setExportBackground(e.target.value)}/></label><div className="export-readout"><span><small>Quadros</small><b>{Math.max(2,Math.round(totalDuration*exportFps)).toLocaleString("pt-BR")}</b></span><span><small>Estimativa</small><b>~{estimatedExportMb} MB</b></span></div><button className="primary export-button" disabled={exporting} onClick={exportMp4}>{exporting?`Renderizando · ${exportProgress}%`:"Exportar MP4"}</button>{exporting&&<progress className="export-progress" max="100" value={exportProgress}/>}<p>Renderização vetorial direta em sRGB, H.264 e frame final completo no estado 8.</p></section></>:panel==="Correspondência"?<><section className="property"><h3>Relação selecionada</h3><div className={`relation-card status-${selectedRelation?.status}`}><small>{relationStatusLabel(selectedRelation?.status??"structural")}</small><b>{selectedRelation?.sourceIndex===null?"Forma multiplicada":selectedRelation?.targetIndex===null?"Forma absorvida":`O${String((selectedRelation?.sourceIndex??0)+1).padStart(2,"0")} → D${String((selectedRelation?.targetIndex??0)+1).padStart(2,"0")}`}</b><span>{selectedRelation?.sourceHole||selectedRelation?.targetHole?"Vazado interno":"Forma preenchida"}</span></div><div className="relation-metrics"><div><small>Origem</small><b>{selectedRelation?.sourceComponent===null?"—":`C${(selectedRelation?.sourceComponent??0)+1}`}</b></div><div><small>Destino</small><b>{selectedRelation?.targetComponent===null?"—":`C${(selectedRelation?.targetComponent??0)+1}`}</b></div><div><small>Pontos</small><b>{selectedRelation?.points??0}</b></div><div><small>Confiança</small><b>{selectedRelation?.confidence??0}%</b></div></div></section><section className="property"><h3>Ajuste fino</h3><Toggle label="Relação confirmada" value={Boolean(confirmed[`${segment.index}:${selectedRelationKey}`])} change={value=>setConfirmed(current=>({...current,[`${segment.index}:${selectedRelationKey}`]:value}))}/><Toggle label="Inverter direção" value={Boolean(reversals[`${segment.index+1}:${targetRelationIndex}`])} change={value=>setReversals(current=>({...current,[`${segment.index+1}:${targetRelationIndex}`]:value}))}/><label className="range-label"><span>Ponto inicial <b>{offsets[`${segment.index+1}:${targetRelationIndex}`]??0}</b></span><input type="range" min="-60" max="60" step="1" value={offsets[`${segment.index+1}:${targetRelationIndex}`]??0} onChange={event=>setOffsets(current=>({...current,[`${segment.index+1}:${targetRelationIndex}`]:+event.target.value}))}/></label><button className="full-button" onClick={resetRelation}>Voltar ao automático</button></section><section className="property"><h3>Diagnóstico</h3><Toggle label="Alinhamento automático" value={autoAlign} change={setAutoAlign}/><div className="diagnostic-legend"><span><i className="native"></i>Nativo</span><span><i className="structural"></i>Estrutural</span><span><i className="semantic"></i>Multiplicação / absorção</span><span><i className="fixed"></i>Imóvel</span></div><p className="property-note">Use “Revisar” para localizar relações estruturais ou sem par. Confirme apenas depois de observar o trecho em 0%, 50% e 100%.</p></section></>:<>
        <section className="property"><h3>Estado selecionado</h3><p className="selected-name">{assets[selected]?.name}</p><div className="button-pair"><button className="full-button" onClick={()=>openImport("replace")}>Substituir SVG</button><button className="full-button danger" onClick={removeState}>Excluir</button></div></section>
        <section className="property easing-property"><h3><span>Timeline</span><em>Trecho {segment.index+1} → {segment.index+2}</em></h3><label>Duração do trecho {segment.index+1}<input className="number-input" type="number" min="0.1" max="30" step="0.1" value={durations[segment.index]} onChange={e=>setDurations(current=>current.map((d,i)=>i===segment.index?Math.max(.1,+e.target.value):d))}/></label><label>Easing deste trecho<select value={activeEase} onChange={e=>updateSegmentEase(e.target.value as EaseName)}><option value="smooth">Suave equilibrado</option><option value="gentle">Delicado</option><option value="sine">Senoidal</option><option value="emphasis">Ênfase central</option><option value="expo">Aceleração intensa</option><option value="easeIn">Acelerar</option><option value="easeOut">Desacelerar</option><option value="linear">Linear</option><option value="custom">Bézier personalizado</option></select></label><div className="curve-editor"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path className="curve-grid" d="M0 100 L100 0 M0 50 H100 M50 0 V100"/><path className="curve-handles" d={`M0 100 L${activeCurve[0]*100} ${100-activeCurve[1]*100} M100 0 L${activeCurve[2]*100} ${100-activeCurve[3]*100}`}/><path className="curve-line" d={`M0 100 C${activeCurve[0]*100} ${100-activeCurve[1]*100},${activeCurve[2]*100} ${100-activeCurve[3]*100},100 0`}/><circle cx={activeCurve[0]*100} cy={100-activeCurve[1]*100} r="3"/><circle cx={activeCurve[2]*100} cy={100-activeCurve[3]*100} r="3"/></svg><code>cubic-bezier({activeCurve.map(value=>value.toFixed(2)).join(", ")})</code>{activeEase==="custom"&&<div className="curve-controls">{activeCustomCurve.map((value,index)=><label key={index}><span>{["X1","Y1","X2","Y2"][index]} <b>{value.toFixed(2)}</b></span><input type="range" min="0" max="1" step="0.01" value={value} onChange={event=>updateSegmentCurvePoint(index,+event.target.value)}/></label>)}</div>}</div><div className="button-pair motion-actions"><button className="full-button" onClick={resetSegmentMotion}>Restaurar trecho</button><button className="full-button" onClick={copySegmentMotionToAll}>Aplicar a todos</button></div><p className="property-note">A curva afeta apenas a passagem de {assets[segment.index]?.name} para {assets[segment.index+1]?.name}.</p><Toggle label="Repetir timeline" value={loop} change={setLoop}/></section>
        <section className="property"><h3>Motor geométrico</h3><div className={`engine-status ${pairTopology.compatible?"native":"fallback"}`}><small>PLANO DO TRECHO {segment.index+1}</small><b>{pairAnalysis.mode}</b><span>{pairTopology.compatible?`${pairTopology.stableCount} parâmetros imóveis · ${pairTopology.totalCount-pairTopology.stableCount} mutáveis`:pairAnalysis.mode.startsWith("Fusão")?"O componente principal constrói a forma; os demais são absorvidos.":"Âncoras, direção e proximidade orientam a matriz estrutural."}</span></div><label>Orçamento estrutural<select disabled={pairTopology.compatible} value={density} onChange={e=>setDensity(+e.target.value)}>{[250,500,1000,1500,2000].map(n=><option key={n} value={n}>{n} pontos</option>)}</select></label><label className="range-label"><span>Arredondamento entre conjuntos <b>{semanticRoundness}%</b></span><input type="range" min="0" max="100" step="1" value={semanticRoundness} onChange={e=>setSemanticRoundness(+e.target.value)}/></label><p className="property-note">A intensidade cresce apenas no meio das fusões e divisões. Estados finais e vazados permanecem intactos.</p><div className="metric-grid"><div><small>Relações</small><b>{pairAnalysis.rows.length}</b></div><div><small>Confiança</small><b>{pairAnalysis.confidence}%</b></div></div></section>
        <section className="property"><h3>Escala</h3><label>Normalização<select value={scaleMode} onChange={e=>setScaleMode(e.target.value as ScaleMode)}><option value="bounds">Enquadrar pela geometria</option><option value="viewBox">Preservar viewBox</option><option value="raw">Coordenadas originais</option></select></label><label className="range-label"><span>Margem <b>{padding}%</b></span><input type="range" min="4" max="24" value={padding} onChange={e=>setPadding(+e.target.value)}/></label></section>
        <section className="property"><h3>Correspondência</h3><Toggle label="Exibir pontos" value={showPoints} change={setShowPoints}/><Toggle label="Alinhamento automático" value={autoAlign} change={setAutoAlign}/></section></>}</aside>
    </section>{notice&&<div className="toast">{notice}</div>}
  </main>
}

function Toggle({label,value,change}:{label:string;value:boolean;change:(v:boolean)=>void}){return <label className="toggle-row"><span>{label}</span><button className={value?"toggle on":"toggle"} onClick={()=>change(!value)}><i/></button></label>}
