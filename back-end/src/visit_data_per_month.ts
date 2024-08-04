import { Visit, GraphData } from "./types";

export function visitCountsPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();
    const visitCounts: number[] = sortedKeys.map(key => visitsPerMonth[key].length);

    const visitsPerMonthGraphData = monthlyGraph('Visites par mois', visitCounts);
    return visitsPerMonthGraphData;
}
export function visitorCountsPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {

    const sortedKeys = Object.keys(visitsPerMonth).sort();
    const visitorCounts: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const uniqueVisitors = new Set<string>();

        visits.forEach(visit => {
            uniqueVisitors.add(visit.visitor_id);
        });

        return uniqueVisitors.size;
    });

    const visitorsPerMonthGraphData = monthlyGraph('Visiteurs par mois', visitorCounts);
    return visitorsPerMonthGraphData;
}
export function visitLengthPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();

    const averageVisitLength: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const totalDuration = visits.reduce((sum, visit) => sum + visit.duration, 0);
        const averageDuration = totalDuration / visits.length;

        const hours = Math.floor(averageDuration / 3600);
        const minutes = Math.floor((averageDuration % 3600) / 60);

        return hours + (minutes / 60);
    });

    const visitLengthPerMonthGraphData = monthlyGraph('Durée moyenne (h) des visites par mois', averageVisitLength);
    return visitLengthPerMonthGraphData;
}
export function averageSpeedPerMonth(visitsPerMonth: { [key: string]: Visit[]; }) {
    const sortedKeys = Object.keys(visitsPerMonth).sort();

    const averageSpeed: number[] = sortedKeys.map(month => {
        const visits = visitsPerMonth[month];
        const totalSpeed = visits.reduce((sum, visit) => sum + visit.speed, 0);
        const averageSpeedThisMonth = totalSpeed / visits.length;

        return averageSpeedThisMonth * 3.6; // m/s => km/h ?
    });

    const visitLengthPerMonthGraphData = monthlyGraph('Vitesse moyenne (km/h) des déplacements par mois', averageSpeed);
    return visitLengthPerMonthGraphData;
}
function monthlyGraph(title: string, data: number[]) {
    const perMonthGraphData: GraphData = {
        title: title,
        chartType: 'bar',
        labels: ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'],
        data: data
    };
    return perMonthGraphData;
}
