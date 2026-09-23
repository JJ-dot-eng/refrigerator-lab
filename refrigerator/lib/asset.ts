// Prefix for files in public/. Empty locally; '/refrigerator-lab' on GitHub Pages (set by next.config).
export const asset=(path:string)=>(process.env.NEXT_PUBLIC_BASE_PATH||'')+path;
