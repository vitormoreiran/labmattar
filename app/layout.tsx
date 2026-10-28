import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"LABMATTAR — Matriz Vetorial",description:"Sistema de transformação vetorial do LABMATTAR"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
