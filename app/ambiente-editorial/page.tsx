"use client";
import dynamic from "next/dynamic";
const EditorialClient=dynamic(()=>import("./EditorialClient"),{ssr:false,loading:()=> <main style={{minHeight:"100dvh",background:"#f7f6f2",padding:"3rem",fontFamily:"Arial,sans-serif"}}>LABMATTAR / AMBIENTE EDITORIAL</main>});
export default function Page(){return <EditorialClient/>;}
