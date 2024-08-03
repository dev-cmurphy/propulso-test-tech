import fs from 'fs';
import csv from 'csv-parser';

enum VisitTimestamp {
    BEFORE,
    IN,
    AFTER
}

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
}


export function analyze_csv() : Promise<GraphData[]> {

    return new Promise((resolve, reject) => {
        const results: RawDataRow[] = [];
        try {

            fs.createReadStream('data/dataset_pathing_extra_light.csv')
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
                    visitLengthPerMonth(visitsPerMonth)
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
            } else if (visitState == VisitTimestamp.BEFORE && ping.delta_time == 0) {
                visitState = VisitTimestamp.IN;
                currentVisit.start = ping.timestamp;
            } else if (visitState == VisitTimestamp.IN && ping.delta_time < 0) {
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