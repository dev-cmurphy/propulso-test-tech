import fs from 'fs';
import csv from 'csv-parser';
import { visitCountsPerMonth, visitorCountsPerMonth, visitLengthPerMonth, averageSpeedPerMonth } from './visit_data_per_month';
import { Vector2D, GraphData, RawDataRow, Visit } from './types';
import { haversineDistance } from './utils';
import { groupVisitsByMonth, groupVisitsByVisitor, rowsPerVisitorSortedByTimestamp } from './group_and_sort_visits';

export function analyzeData() : Promise<{}> {

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
                const fullData = extractMetricsFromData(results);
                console.log("Sending data");
                resolve(fullData);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function extractMetricsFromData(results: RawDataRow[]) {
    console.log("Read data...");
    results.sort((a, b) => a.timestamp - b.timestamp);
    console.log("Sorted data...");
    const visits = getVisits(results);
    console.log("Got visits.");
    const visitsPerMonth = groupVisitsByMonth(visits);
    console.log("Got visits per month...");
    const visitLengthPerMonthGraphData = visitLengthPerMonth(visitsPerMonth);
    console.log("Got visits length per month...");
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
    const fullData = {
        graphs: graphData,
        table: tableData
    };
    return fullData;
}

function getAverageDayCountBetweenVisits(visits: Visit[]): number {

    const visitsByVisitor = groupVisitsByVisitor(visits);
    
    let totalCount = 0;
    let totalDayCounts = 0;
    for (const visitor in visitsByVisitor) {

        let lastVisitEndTimestamp = -1;
        visits = visitsByVisitor[visitor];
        if (visits.length > 1) {
            for (const v of visits) {
                if (lastVisitEndTimestamp > -1) {
                    const deltaTime = v.start - lastVisitEndTimestamp;
                    const timeInDays = deltaTime / (24 * 3600);
                    
                    totalDayCounts += timeInDays;
                    totalCount++;
                } 

                lastVisitEndTimestamp = v.end;
            }
        }
    }

    const averageCount = totalDayCounts / totalCount;

    return averageCount;
}

function getVisits(rawSortedfullData: RawDataRow[]): Visit[] {
    const visits: Visit[] = [];
    const groupedData = rowsPerVisitorSortedByTimestamp(rawSortedfullData);

    // on considère qu'une transition est faite si on passe un certain TIME_TRESHOLD (s) dans un nouvel état
    const TIME_TRESHOLD = 5 * 60; // 5 minutes

    // si un ping est détecté à plus de MAX_VISIT_TIME_GAP (s) d'intervalles, on le considère comme une nouvelle visite.
    const MAX_VISIT_TIME_GAP = 24 * 60 * 60 // 24 h

    enum VisitingState {
        BEFORE,
        DURING,
        AFTER
    };

    for (const visitor in groupedData) {
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
                        case VisitingState.AFTER:
                            if (previousState === VisitingState.DURING) {
                                recordVisit = true;
                            }
                            break;
                        case VisitingState.DURING:
                            if (previousState !== VisitingState.DURING) {
                                currentDisplacement.start = currentTimestamp;
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
