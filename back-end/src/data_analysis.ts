import fs from 'fs';
import csv from 'csv-parser';

export interface RawDataRow {
    uid: string;
    lat: number;
    lon: number;
    dt:  number;
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

            fs.createReadStream('data/dataset_pathing_extra_light.csv')
            .pipe(csv())
            .on('data', (data) => {
                console.log(data);
                results.push(data);
            })
            .on('end', () => {
                
                results.sort((a, b) => b.timestamp - a.timestamp)
                const visits = getVisits(results);

                const graphData: GraphData[] = [
                    getVisitsPerMonth(visits)
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

    const visitsDict: { [key: string] : {}} = {}; 

    for (const item of rawSortedfullData) {
        if (item.dt > 0) {
            visitsDict[item.uid] = { 
                start: item.timestamp
            };
        } 
    }

    return visits;
}

function getVisitsPerMonth(visits: Visit[]) {
    const visitsPerMonth: number[] = [1,2,4,6,1,2,5,3,6,2,2,1];

    // une paire t_in et t_out = une visite (t_in si dt >0, t_out si dt < 0)

    const visitsPerMonthGraphData: GraphData = {
        title: 'Visites par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: visitsPerMonth
    };
    return visitsPerMonthGraphData;
}