"use strict";

import { memo, useMemo } from 'react';
import { transformStyle } from "../utils/StyleValue.js";
import RNMBXRainNativeComponent from '../specs/RNMBXRainNativeComponent';
import { jsx as _jsx } from "react/jsx-runtime";
export const Rain = /*#__PURE__*/memo(props => {
  const baseProps = useMemo(() => {
    return {
      ...props,
      reactStyle: transformStyle(props.style),
      style: undefined
    };
  }, [props]);
  return /*#__PURE__*/_jsx(RNMBXRainNativeComponent, {
    ...baseProps
  });
});
//# sourceMappingURL=Rain.js.map