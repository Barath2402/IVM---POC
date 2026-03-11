import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { AWSInventoryEntry, AzureInventoryEntry, CloudAgentEntry } from '../types';

export const parseInventoryFile = async <T>(file: File, mapper: (row: any) => T): Promise<T[]> => {
    try {
        let data: any[] = [];
        if (file.name.endsWith('.csv')) {
            data = await new Promise<any[]>((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data),
                    error: reject
                });
            });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        } else {
            throw new Error('Unsupported file type');
        }
        return data.map(mapper);
    } catch (error) {
        console.error('Error parsing inventory file:', error);
        throw error;
    }
};

export const mapAwsRow = (row: any): AWSInventoryEntry => ({
    ip: row['Private IP'] || row['IP'] || row['IP Address'] || '',
    instanceId: row['Instance ID'] || row['ID'] || '',
    environment: row['Environment'] || row['Env'] || 'Unknown',
    region: row['Region'] || '',
});

export const mapAzureRow = (row: any): AzureInventoryEntry => ({
    ip: row['Private IP'] || row['IP'] || row['IP Address'] || '',
    resourceId: row['Resource ID'] || row['ID'] || '',
    environment: row['Environment'] || row['Env'] || 'Unknown',
    location: row['Location'] || '',
});

export const mapCloudAgentRow = (row: any): CloudAgentEntry => ({
    ip: row['IP Address'] || row['IP'] || '',
    agentId: row['Agent ID'] || row['ID'] || '',
    lastCheckedIn: row['Last Checked In'] || row['Last Check-in'] || row['Last Scanned'] || '',
    status: row['Status'] || '',
});
