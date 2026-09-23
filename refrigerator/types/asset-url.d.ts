// Vite "?url" imports resolve to the emitted file's URL.
declare module '*?url' {
  const src: string;
  export default src;
}

declare module 'occt-import-js' {
  const factory: (options?: {locateFile?: (path: string) => string}) => Promise<unknown>;
  export default factory;
}
