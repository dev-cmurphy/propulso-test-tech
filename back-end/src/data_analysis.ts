import fs from 'fs';
import csv from 'csv-parser';
import { visitCountsPerMonth, visitorCountsPerMonth, visitLengthPerMonth, averageSpeedPerMonth } from './visit_data_per_month';
import { Vector2D, GraphData, RawDataRow, Visit } from './types';
import { haversineDistance } from './utils';

export function analyze_csv() : Promise<{}> {

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
                const visitLengthPerMonthGraphData = visitLengthPerMonth(visitsPerMonth);
                const averageVisitLentgh = visitLengthPerMonthGraphData.data.reduce((acc, val) => acc + val, 0) / 12;

                const graphData: GraphData[] = [
                    visitCountsPerMonth(visitsPerMonth),
                    visitorCountsPerMonth(visitsPerMonth),
                    averageSpeedPerMonth(visitsPerMonth),
                    visitLengthPerMonthGraphData
                ];
                const tableData = {
                    'Nombre moyen de jours entre les visites des visiteurs': getAverageDayCountBetweenVisits(visits),
                    'Durée moyenne des visites (h)': averageVisitLentgh
                };
                resolve({ 
                    graphs: graphData,
                    table: tableData
                });
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

function getAverageDayCountBetweenVisits(visits: Visit[]): number {

    const visitsByVisitor = groupVisitsByVisitor(visits);
    
    let totalCount = -1;
    let totalDayCounts = 0;
    for (const visitor in visitsByVisitor) {

        let lastVisitEndTimestamp = -1;
        visits = visitsByVisitor[visitor];
        if (visits.length > 1) {
            for (const v of visits) {
                totalCount++;

                if (lastVisitEndTimestamp > -1) {
                    const deltaTime = v.start - lastVisitEndTimestamp;
                    const timeInDays = deltaTime / (24 * 3600);
                    
                    totalDayCounts += timeInDays;
                }

                lastVisitEndTimestamp = v.end;
            }
        }
    }


    const averageCount = totalDayCounts / totalCount;

    return averageCount;
}

function groupVisitsByVisitor(visits: Visit[]): { [key: string]: Visit[] } {

    const groups = visits.reduce((acc, visit) => {
        if (!acc[visit.visitor_id]) {
            acc[visit.visitor_id] = [];
        }
        acc[visit.visitor_id].push(visit);
        return acc;
    }, {} as { [key: string]: Visit[] });

    return groups;
}

function getVisits(rawSortedfullData: RawDataRow[]): Visit[] {
    const visits: Visit[] = [];
    const groupedData = rowsPerVisitorSortedByTimestamp(rawSortedfullData);

    // on considère qu'une transition est faite si on passe un certain TIME_TRESHOLD (s) dans un nouvel état
    const TIME_TRESHOLD = 5 * 60; 

    // si un ping est détecté à plus de MAX_VISIT_TIME_GAP (s) d'intervalles, on le considère comme une nouvelle visite.
    const MAX_VISIT_TIME_GAP = 24 * 60 * 60 

    for (const visitor of Object.keys(groupedData)) {
        const pings = groupedData[visitor];
        let currentDisplacement: Visit = {
            visitor_id: visitor,
            start: -1,
            end: -1,
            duration: -1,
            speed: -1
        };
        let previousState: VisitingState = VisitingState.BEFORE;

        let totalDisplacement = 0;
        let totalTime = 0;
        let lastPosition: Vector2D = [0, 0];
        let lastTimestamp: number = 0;

        let stateStartTime: number = 0;

        for (const ping of pings) {
            let currentPosition: Vector2D = [ping.lat, ping.lon];
            let currentTimestamp: number = ping.timestamp;
            let dt = currentTimestamp - lastTimestamp;
        
            let visitingState = getVisitingStateFromDt(ping.delta_time);
            let recordVisit: boolean = false;
            if (lastTimestamp > 0 && currentTimestamp > lastTimestamp) { 

                if (dt > MAX_VISIT_TIME_GAP && visitingState === VisitingState.DURING) {
                    recordVisit = true;
                } else {

                    let displacement = haversineDistance(currentPosition, lastPosition);

                    totalDisplacement += displacement;
                    totalTime += dt;
                }
            }
            
            if (visitingState !== previousState && !recordVisit) {
                if (stateStartTime === 0) {
                    stateStartTime = currentTimestamp;
                } else if (currentTimestamp - stateStartTime >= TIME_TRESHOLD ) {
                    stateStartTime = currentTimestamp;
                    switch (visitingState) {
                        case VisitingState.BEFORE: 
                            if (previousState === VisitingState.DURING) {
                                recordVisit = true;
                            }
                            break;
                        case VisitingState.DURING:
                            if (previousState !== VisitingState.DURING) {
                                currentDisplacement.start = currentTimestamp;
                            }
                            break;
                        case VisitingState.AFTER:
                            if (previousState === VisitingState.DURING) {
                                recordVisit = true;
                            }
                            break;
                    }
                    
                    previousState = visitingState;
                }

                if (recordVisit) { 
                    addVisit(currentDisplacement, ping, totalDisplacement, totalTime);
                    totalDisplacement = 0;
                    totalTime = 0;

                    currentDisplacement = {
                        visitor_id: visitor,
                        start: -1,
                        end: -1,
                        duration: -1,
                        speed: -1
                    };
                }
            } else {
                stateStartTime = 0;
            }

            lastPosition = currentPosition;
            lastTimestamp = currentTimestamp;
        }
    }

    return visits;

    function addVisit(currentDisplacement: Visit, ping: RawDataRow, totalDisplacement: number, totalTime: number) {

        currentDisplacement.duration = ping.timestamp - currentDisplacement.start;
        currentDisplacement.end = ping.timestamp;
        currentDisplacement.speed = totalDisplacement / totalTime;
        visits.push(currentDisplacement);
    }

    function getVisitingStateFromDt(dt: number) {
        if (dt == 0)
            return VisitingState.DURING;
        else if (dt < 0)
            return VisitingState.AFTER;
        
        return VisitingState.BEFORE;
    }
}


/**
 * Retourne les rangées regroupées par visiteur et triées en ordre croissant de timestamp
 */
function rowsPerVisitorSortedByTimestamp(rawSortedfullData: RawDataRow[]): { [key: string]: RawDataRow[] } {
    return rawSortedfullData.reduce((acc, row) => {
        if (!acc[row.propulso_id]) {
            acc[row.propulso_id] = [];
        }
        acc[row.propulso_id].push(row);
        return acc;
    }, {} as { [key: string]: RawDataRow[]; });
}

/**
 * Retourne les visites regroupées par mois
 */
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