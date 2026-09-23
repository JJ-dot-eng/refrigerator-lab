// Vite "?url" imports resolve to the emitted file's URL.
declare module '*?url' {
  const src: string;
  export default src;
}
