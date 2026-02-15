declare module "@mapbox/mapbox-gl-geocoder" {
  import { IControl, Map, LngLatLike } from "mapbox-gl";

  interface GeocoderOptions {
    accessToken: string;
    mapboxgl?: typeof import("mapbox-gl");
    marker?: boolean;
    placeholder?: string;
    proximity?: LngLatLike;
    flyTo?: boolean | object;
    countries?: string;
    types?: string;
    minLength?: number;
    limit?: number;
    language?: string;
    filter?: (feature: any) => boolean;
    localGeocoder?: (query: string) => any[];
    reverseGeocode?: boolean;
    enableEventLogging?: boolean;
    render?: (feature: any) => string;
    getItemValue?: (feature: any) => string;
    mode?: string;
    localGeocoderOnly?: boolean;
    autocomplete?: boolean;
    fuzzyMatch?: boolean;
    routing?: boolean;
    worldview?: string;
    collapsed?: boolean;
    clearOnBlur?: boolean;
    clearAndBlurOnEsc?: boolean;
    bbox?: [number, number, number, number];
    zoom?: number;
  }

  interface GeocoderResult {
    result: {
      center: [number, number];
      place_name: string;
      place_type: string[];
      properties: Record<string, any>;
      text: string;
      [key: string]: any;
    };
  }

  class MapboxGeocoder implements IControl {
    constructor(options: GeocoderOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(): void;
    query(query: string): this;
    setInput(value: string): this;
    setProximity(proximity: LngLatLike): this;
    getProximity(): LngLatLike;
    setRenderFunction(render: (feature: any) => string): this;
    setLanguage(language: string): this;
    getLanguage(): string;
    setZoom(zoom: number): this;
    getZoom(): number;
    setFlyTo(flyTo: boolean | object): this;
    getFlyTo(): boolean | object;
    setPlaceholder(placeholder: string): this;
    getPlaceholder(): string;
    setBbox(bbox: [number, number, number, number]): this;
    getBbox(): [number, number, number, number];
    setCountries(countries: string): this;
    getCountries(): string;
    setTypes(types: string): this;
    getTypes(): string;
    setMinLength(minLength: number): this;
    getMinLength(): number;
    setLimit(limit: number): this;
    getLimit(): number;
    setFilter(filter: (feature: any) => boolean): this;
    setOrigin(origin: string): this;
    getOrigin(): string;
    clear(): void;
    on(event: "result", callback: (e: GeocoderResult) => void): this;
    on(event: "results", callback: (e: any) => void): this;
    on(event: "error", callback: (e: any) => void): this;
    on(event: "loading", callback: (e: any) => void): this;
    on(event: "clear", callback: () => void): this;
    off(event: string, callback: (...args: any[]) => void): this;
  }

  export default MapboxGeocoder;
}
