declare module "@mapbox/mapbox-gl-draw" {
  import { IControl, Map } from "mapbox-gl";

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    styles?: object[];
    modes?: object;
    keybindings?: boolean;
    touchEnabled?: boolean;
    boxSelect?: boolean;
    clickBuffer?: number;
    touchBuffer?: number;
  }

  interface FeatureCollection {
    type: "FeatureCollection";
    features: GeoJSON.Feature[];
  }

  class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    get(featureId: string): GeoJSON.Feature | undefined;
    getAll(): FeatureCollection;
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
    getMode(): string;
    changeMode(mode: string, options?: object): this;
    setFeatureProperty(featureId: string, property: string, value: any): this;
  }

  export default MapboxDraw;
}
