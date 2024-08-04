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


function getVisits(rawSortedfullData: RawDataRow[]): Visit[] {
    const visits: Visit[] = [];
    const groupedData = groupedAndSortedRows(rawSortedfullData);

    for (const visitor in groupedData) {
        const pings = groupedData[visitor];
        let currentVisit: Visit = {
            visitor_id: visitor,
            start: -1,
            end: -1,
            duration: -1,
            speed: -1
        };
        let visiting: boolean = false;

        let totalDisplacement = 0;
        let totalTime = 0;
        let lastPosition: Vector2D = [0, 0];
        let lastTimestamp: number = 0;

        for (const item in pings) {
            const ping = pings[item];

            let currentPosition: Vector2D = [ping.lat, ping.lon];
            let currentTimestamp: number = ping.timestamp;
            if (lastTimestamp > 0) { 
                let displacement = haversineDistance(currentPosition, lastPosition);
                
                let dt = currentTimestamp - lastTimestamp;
                totalDisplacement += displacement;
                totalTime += dt;
            }

            // on définit une visite comme étant une plage
            // de zéros bornée par un positif OU un négatif
            // car il arrive parfois que les données nous présentent
            // des visites qui ne sont pas précédées par du + et suivies de -
            // donc, à chaque fois qu'on passe d'un zéro à un non-zéro, on enregistre une visite 
            // (mais pas d'un non-zéro à un zéro)

            if (!visiting) {
                if (ping.delta_time == 0) {
                    visiting = true;
                    currentVisit.start = ping.timestamp;
                }
            } else {
                if (ping.delta_time != 0) {
                    visiting = false;
                    addVisit(currentVisit, ping, totalDisplacement, totalTime);
                    
                    totalDisplacement = 0;
                    totalTime = 0;
                }
            }

            lastPosition = currentPosition;
            lastTimestamp = currentTimestamp;
        }
    }


    return visits;

    function addVisit(currentVisit: Visit, ping: RawDataRow, totalDisplacement: number, totalTime: number) {
        currentVisit.duration = ping.timestamp - currentVisit.start; // pour éviter d'avoir à le recalculer à chaque fois
        currentVisit.end = ping.timestamp;
        // le déplacement total est relié à toutes les données sur la visite, 
        // pas seulement le déplacement à l'intérieur de la zone
        currentVisit.speed = totalDisplacement / (totalTime);

        visits.push(currentVisit);
    }
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