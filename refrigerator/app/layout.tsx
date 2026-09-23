import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Hoshizaki HR24B · 실제 배치 대조',description:'1도어 냉장고 설계 및 시뮬레이션'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
