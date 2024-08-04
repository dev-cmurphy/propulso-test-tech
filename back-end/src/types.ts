export type Vector2D = [number, number];
export interface RawDataRow {
    propulso_id: string;
    lat: number;
    lon: number;
    delta_time: number;
    timestamp: number;
}
export interface GraphData {
    title: string;
    chartType: string;
    labels: string[];
    data: number[];
}
export interface Visit {
    visitor_id: string;
    start: number;
    end: number;
    duration: number;
    speed: number;
}
