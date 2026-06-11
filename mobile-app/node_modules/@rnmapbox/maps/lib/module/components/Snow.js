"use strict";

import { memo, useMemo } from 'react';
import { transformStyle } from "../utils/StyleValue.js";
import RNMBXSnowNativeComponent from '../specs/RNMBXSnowNativeComponent';
import { jsx as _jsx } from "react/jsx-runtime";
export const Snow = /*#__PURE__*/memo(props => {
  const baseProps = useMemo(() => {
    return {
      ...props,
      reactStyle: transformStyle(props.style),
      style: undefined
    };
  }, [props]);
  return /*#__PURE__*/_jsx(RNMBXSnowNativeComponent, {
    ...baseProps
  });
});
//# sourceMappingURL=Snow.js.map