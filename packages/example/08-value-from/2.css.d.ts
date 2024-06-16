declare const styles:
  & Readonly<{ "value1": string }>
  & Readonly<{ "value2": string }>
  & Readonly<{ "value3": string }>
  & Readonly<{ "value4": string }>
  & Readonly<Pick<(typeof import("./3.css"))["default"], "value5">>
;
export default styles;
//# sourceMappingURL=./2.css.d.ts.map
