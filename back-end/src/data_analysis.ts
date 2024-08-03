import fs from 'fs';
import csv from 'csv-parser';
import { group } from 'console';

enum VisitTimestamp {
    BEFORE,
    IN,
    AFTER
}

export interface RawDataRow {
    propulso_id: string;
    lat: number;
    lon: number;
    delta_time: number;
    timestamp: number
}

export interface GraphData {
    title: string,
    chartType: string,
    labels: string[],
    data: number[]
}

export interface Visit {
    visitor_id: string,
    start: number,
    end: number,
    duration: number,
}


export function analyze_csv() : Promise<GraphData[]> {

    return new Promise((resolve, reject) => {
        const results: RawDataRow[] = [];
        try {

            fs.createReadStream('data/dataset_pathing_expanded.csv')
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                
                results.sort((a, b) => b.timestamp - a.timestamp)
                const visits = getVisits(results);
                const visitsPerMonth = getVisitsPerMonth(visits)

                const graphData: GraphData[] = [
                    visitCountsPerMonth(visitsPerMonth),
                    
                ];
                resolve(graphData);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function getVisits(rawSortedfullData: RawDataRow[]): Visit[] {
    const visits: Visit[] = []

    // une paire t_in et t_out = une visite (t_in si dt >0, t_out si dt < 0) ? à continuer

    // on regroupe les entrées par ID (toujours triés)
    // pour un groupe
    //  pour chaque entrée: 
    //      chaque fois qu'on trouve une "sortie", on note une visite (avec le temps de début)

    const groupedData = rawSortedfullData.reduce((acc, row) => {
        if (!acc[row.propulso_id]) {
            acc[row.propulso_id] = [];
        }
        acc[row.propulso_id].push(row);
        return acc;
    }, {} as { [key: string]: RawDataRow[] });

    for (const visitor in groupedData) {
        const pings = groupedData[visitor];
        let currentVisit: Visit = {
            visitor_id: visitor,
            start: 0,
            end: 0,
            duration: 0
        };
        let visitState: VisitTimestamp = VisitTimestamp.BEFORE;
        for (const item in pings) {
            const ping = pings[item];

            if (visitState == VisitTimestamp.AFTER && ping.delta_time > 0) {
                visitState = VisitTimestamp.BEFORE;
            }

            if (visitState == VisitTimestamp.BEFORE && ping.delta_time == 0) {
                visitState = VisitTimestamp.IN;
                currentVisit.start = ping.timestamp;
            }

            if (visitState == VisitTimestamp.IN && ping.delta_time < 0) {
                visitState = VisitTimestamp.AFTER;
                currentVisit.duration = ping.timestamp - currentVisit.start;
                currentVisit.end = ping.timestamp;

                visits.push(currentVisit); 
            }
        }
    }


    return visits;
}

function getVisitsPerMonth(visits: Visit[]) {

    // une paire t_in et t_out = une visite (t_in si dt >0, t_out si dt < 0)

    const visitsPerMonth = visits.reduce((acc, visit) => {
        const monthYear: string = (new Date(visit.start * 1000).getMonth() + 1).toString();
        if (!acc[monthYear]) {
            acc[monthYear] = 0;
        }
        acc[monthYear]++;
        return acc;
    }, {} as { [key: string]: number });

    return visitsPerMonth
}

function visitCountsPerMonth(visitsPerMonth: { [key: string]: number; }) {
    const visitCounts: number[] = Object.keys(visitsPerMonth).sort().map(key => visitsPerMonth[key]);

    const visitsPerMonthGraphData: GraphData = {
        title: 'Visites par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: visitCounts
    };
    return visitsPerMonthGraphData;
}
