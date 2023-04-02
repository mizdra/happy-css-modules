declare const styles:
  & Readonly<{ "a": string }>
  & Readonly<Pick<(typeof import("./2.css"))["default"], "b">>
;
export default styles;
//# sourceMappingURL=./1.css.d.ts.map
