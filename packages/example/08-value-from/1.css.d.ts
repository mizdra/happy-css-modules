declare const styles:
  & Readonly<Pick<(typeof import("./2.css"))["default"], "value1">>
  & Readonly<Pick<(typeof import("./2.css"))["default"], "value2">>
  & Readonly<Pick<(typeof import("./2.css"))["default"], "value3">>
  & Readonly<{ "alias": (typeof import("./2.css"))["default"]["value4"] }>
  & Readonly<Pick<(typeof import("./3.css"))["default"], "value5">>
;
export default styles;
//# sourceMappingURL=./1.css.d.ts.map
