import type { RainLayerStyleProps } from '../utils/MapboxStyles';
import type { BaseProps } from '../types/BaseProps';
type Props = BaseProps & {
    /** Rain particle effect style properties.
     *
     * @note The default `color` and `vignetteColor` values use `measure-light("brightness")`
     * expressions that are only available in Mapbox Standard-based styles
     * (`mapbox://styles/mapbox/standard`, `mapbox://styles/mapbox/standard-satellite`).
     * When using legacy or custom styles, set `color` and `vignetteColor` explicitly to
     * avoid "Brightness is unavailable in the current evaluation context" warnings and
     * invisible rain. For example: `color="#a8adbc" vignetteColor="#464646"`.
     */
    style?: RainLayerStyleProps;
};
export declare const Rain: import("react").MemoExoticComponent<(props: Props) => import("react/jsx-runtime").JSX.Element>;
export {};
//# sourceMappingURL=Rain.d.ts.map