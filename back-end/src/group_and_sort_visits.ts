import { RawDataRow, Visit } from "./types";

export function rowsPerVisitorSortedByTimestamp(rawSortedfullData: RawDataRow[]): { [key: string]: RawDataRow[]; } {
    return rawSortedfullData.reduce((acc, row) => {
        if (!acc[row.propulso_id]) {
            acc[row.propulso_id] = [];
        }
        acc[row.propulso_id].push(row);
        return acc;
    }, {} as { [key: string]: RawDataRow[]; });
}

export function groupVisitsByMonth(visits: Visit[]): { [key: string]: Visit[]; } {
    const visitsPerMonth = visits.reduce((acc, visit) => {
        const monthYear: string = (new Date(visit.start * 1000).getMonth() + 1).toString();
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(visit);
        return acc;
    }, {} as { [key: string]: Visit[]; });

    return visitsPerMonth;
}

export function groupVisitsByVisitor(visits: Visit[]): { [key: string]: Visit[]; } {

    const groups = visits.reduce((acc, visit) => {
        if (!acc[visit.visitor_id]) {
            acc[visit.visitor_id] = [];
        }
        acc[visit.visitor_id].push(visit);
        return acc;
    }, {} as { [key: string]: Visit[]; });

    return groups;
}
