import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'Refrigerator Lab',template:'%s · Refrigerator Lab'},description:'업소용 냉장고 3D 설계와 냉동 사이클 시뮬레이션'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
