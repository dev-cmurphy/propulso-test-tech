import fs from 'fs';
import csv from 'csv-parser';
import { visitCountsPerMonth, visitorCountsPerMonth, visitLengthPerMonth, averageSpeedPerMonth } from './visit_data_per_month';
import { Vector2D, GraphData, RawDataRow, Visit } from './types';
import { haversineDistance } from './utils';

export function analyze_csv() : Promise<GraphData[]> {

    return new Promise((resolve, reject) => {
        const results: RawDataRow[] = [];
        try {

            fs.createReadStream('data/dataset_pathing_expanded.csv')
            .pipe(csv())
            .on('data', (data) => {
                const parsedData: RawDataRow = {
                    propulso_id: data.propulso_id,
                    lat: parseFloat(data.lat),
                    lon: parseFloat(data.lon),
                    delta_time: parseInt(data.delta_time),
                    timestamp: parseInt(data.timestamp)
                };
                results.push(parsedData);
            })
            .on('end', () => {
                
                results.sort((a, b) => a.timestamp - b.timestamp)
                const visits = getVisits(results);
                const visitsPerMonth = getVisitsPerMonth(visits)

                const graphData: GraphData[] = [
                    visitCountsPerMonth(visitsPerMonth),
                    visitorCountsPerMonth(visitsPerMonth),
                    visitLengthPerMonth(visitsPerMonth),
                    averageSpeedPerMonth(visitsPerMonth)
                ];
                resolve(graphData);
            });
        } catch (error) {
            reject(error);
        }
    });
}

enum VisitingState {
    BEFORE,
    DURING,
    AFTER
};


function getVisits(rawSortedfullData: RawDataRow[]): Visit[] {
    const visits: Visit[] = [];
    const groupedData = groupedAndSortedRows(rawSortedfullData);

    for (const visitor in groupedData) {
        const pings = groupedData[visitor];
        let currentDisplacement: Visit = {
            visitor_id: visitor,
            start: -1,
            end: -1,
            duration: -1,
            speed: -1
        };
        let visitingState: VisitingState = VisitingState.BEFORE;
        let previousState: VisitingState = visitingState;

        let totalDisplacement = 0;
        let totalTime = 0;
        let lastPosition: Vector2D = [0, 0];
        let lastTimestamp: number = 0;

        for (const item in pings) {
            const ping = pings[item];

            let currentPosition: Vector2D = [ping.lat, ping.lon];
            let currentTimestamp: number = ping.timestamp;
            if (lastTimestamp > 0 && currentTimestamp > lastTimestamp) { 
                let displacement = haversineDistance(currentPosition, lastPosition);

                let dt = currentTimestamp - lastTimestamp;
            
                const SPEED_TRESHOLD = 5;// on pose que ce sont des déplacements à pied, donc max 5 m/s;

                if (displacement / dt < SPEED_TRESHOLD) {
                    totalDisplacement += displacement;
                    totalTime += dt;
                }
            }
            
            visitingState = getVisitingStateFromDt(ping.delta_time);
            let recordVisit: boolean = false;

            switch (visitingState) {
                case VisitingState.BEFORE: 
                    if (previousState == VisitingState.DURING) // implique qu'on a terminé une visite, sans avoir eu de ping "d'after"
                        recordVisit = true;
                    break;
                case VisitingState.DURING:
                    if (previousState != VisitingState.DURING) // implique qu'on a commencé une visite
                        currentDisplacement.start = ping.timestamp;
                    break;
                case VisitingState.AFTER:
                    if (previousState == VisitingState.DURING) // implique qu'on a terminé une visite
                        recordVisit = true;
                    break;
            }

            if (recordVisit) { 
                addVisit(currentDisplacement, ping, totalDisplacement, totalTime);
                totalDisplacement = 0;
                totalTime = 0;
            }

            lastPosition = currentPosition;
            lastTimestamp = currentTimestamp;

            previousState = visitingState;
        }
    }

    return visits;

    function addVisit(currentDisplacement: Visit, ping: RawDataRow, totalDisplacement: number, totalTime: number) {
 
        if (totalTime == 0) // on discarte les visites "vides" (provoquées par données "aberrantes")
             return;

        currentDisplacement.duration = ping.timestamp - currentDisplacement.start; // pour éviter d'avoir à le recalculer à chaque fois
        currentDisplacement.end = ping.timestamp;
        // le déplacement total est relié à toutes les données sur la visite (avant, pendant, après), 
        // pas seulement le déplacement à l'intérieur de la zone
        currentDisplacement.speed = totalDisplacement / (totalTime);
        visits.push(currentDisplacement);
    }
}


function getVisitingStateFromDt(dt: number) {
    if (dt == 0)
        return VisitingState.DURING;
    else if (dt < 0)
        return VisitingState.AFTER;
    
    return VisitingState.BEFORE;
}

function groupedAndSortedRows(rawSortedfullData: RawDataRow[]): { [key: string]: RawDataRow[] } {
    return rawSortedfullData.reduce((acc, row) => {
        if (!acc[row.propulso_id]) {
            acc[row.propulso_id] = [];
        }
        acc[row.propulso_id].push(row);
        return acc;
    }, {} as { [key: string]: RawDataRow[]; });
}

function getVisitsPerMonth(visits: Visit[]): { [key: string]: Visit[] } {
    const visitsPerMonth = visits.reduce((acc, visit) => {
        const monthYear: string = (new Date(visit.start * 1000).getMonth() + 1).toString();
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(visit);
        return acc;
    }, {} as { [key: string]: Visit[] });

    return visitsPerMonth;
}