declare const styles:
  & Readonly<Pick<(typeof import("./3.css"))["default"], "b">>
  & Readonly<{ "b": string }>
  & Readonly<Pick<(typeof import("./2.css"))["default"], "a">>
  & Readonly<{ "a": string }>
;
export default styles;
//# sourceMappingURL=./1.css.d.ts.map
