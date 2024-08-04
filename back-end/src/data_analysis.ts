import fs from 'fs';
import csv from 'csv-parser';

type Vector2D = [number, number];

interface RawDataRow {
    propulso_id: string;
    lat: number;
    lon: number;
    delta_time: number;
    timestamp: number
}

interface GraphData {
    title: string,
    chartType: string,
    labels: string[],
    data: number[]
}

interface Visit {
    visitor_id: string,
    start: number,
    end: number,
    duration: number,
    speed: number
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function haversineDistance(coord1: Vector2D, coord2: Vector2D): number {
    const R = 6371e3; // Earth's radius in meters

    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return distance; // distance in meters
}


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

            // comment on définit une visite ?
            // on définit une visite comme étant une plage
            // de zéros bornée par un positif OU un négatif

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
        currentVisit.speed = totalDisplacement / (totalTime);

        visits.push(currentVisit);
    }
}


function groupedAndSortedRows(rawSortedfullData: RawDataRow[]) {
    return rawSortedfullData.reduce((acc, row) => {
        if (!acc[row.propulso_id]) {
            acc[row.propulso_id] = [];
        }
        acc[row.propulso_id].push(row);
        return acc;
    }, {} as { [key: string]: RawDataRow[]; });
}

function getVisitsPerMonth(visits: Visit[]) {
    const visitsPerMonth = visits.reduce((acc, visit) => {
        const monthYear: string = (new Date(visit.start * 1000).getMonth() + 1).toString();
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(visit);
        return acc;
    }, {} as { [key: string]: Visit[] });

    return visitsPerMonth
}

function visitCountsPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();
    const visitCounts: number[] = sortedKeys.map(key => visitsPerMonth[key].length);

    const visitsPerMonthGraphData: GraphData = {
        title: 'Visites par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: visitCounts
    };
    return visitsPerMonthGraphData;
}

function visitorCountsPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {

    const sortedKeys = Object.keys(visitsPerMonth).sort();
    const visitorCounts: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const uniqueVisitors = new Set<string>();
      
        visits.forEach(visit => {
          uniqueVisitors.add(visit.visitor_id);
        });
      
        return uniqueVisitors.size;
    });

    const visitorsPerMonthGraphData: GraphData = {
        title: 'Visiteurs par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: visitorCounts
    };
    return visitorsPerMonthGraphData;
}

function visitLengthPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();

    const averageVisitLength: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const totalDuration = visits.reduce((sum, visit) => sum + visit.duration, 0);
        const averageDuration = totalDuration / visits.length;

        const hours = Math.floor(averageDuration / 3600);
        const minutes = Math.floor((averageDuration % 3600) / 60);
        
        return hours + (minutes / 60);
    });

    const visitLengthPerMonthGraphData: GraphData = {
        title: 'Durée moyenne (h) des visites par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: averageVisitLength
    };
    return visitLengthPerMonthGraphData;
}

function averageSpeedPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();

    const averageSpeed: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const totalSpeed = visits.reduce((sum, visit) => sum + visit.speed, 0);
        const averageSpeedThisMonth = totalSpeed / visits.length;

        return averageSpeedThisMonth * 3.6; // m/s => km/h ?
    });

    const visitLengthPerMonthGraphData: GraphData = {
        title: 'Vitesse moyenne des déplacements par mois',
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: averageSpeed
    };
    return visitLengthPerMonthGraphData;
}