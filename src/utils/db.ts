import localforage from 'localforage';
import type { VulnerabilityRecord, MetricSummary, CMDBEntry } from '../types';

const STORAGE_KEY = 'ivm_dashboard_data';
const CMDB_KEY = 'ivm_cmdb_data';
const AWS_INV_KEY = 'ivm_aws_inventory';
const AZURE_INV_KEY = 'ivm_azure_inventory';
const CLOUD_AGENT_KEY = 'ivm_cloud_agent_data';

export const db = {
    getRecords: async (): Promise<VulnerabilityRecord[]> => {
        try {
            const data = await localforage.getItem<VulnerabilityRecord[]>(STORAGE_KEY);
            return data || [];
        } catch {
            return [];
        }
    },

    setRecords: async (records: VulnerabilityRecord[]): Promise<void> => {
        try {
            await localforage.setItem(STORAGE_KEY, records);
        } catch (e) {
            console.error('Failed to save to localforage:', e);
        }
    },

    clearRecords: async (): Promise<void> => {
        await localforage.removeItem(STORAGE_KEY);
        await localforage.removeItem(CMDB_KEY);
        await localforage.removeItem(AWS_INV_KEY);
        await localforage.removeItem(AZURE_INV_KEY);
        await localforage.removeItem(CLOUD_AGENT_KEY);
    },

    getCMDB: async (): Promise<CMDBEntry[]> => {
        try {
            const data = await localforage.getItem<CMDBEntry[]>(CMDB_KEY);
            return data || [];
        } catch {
            return [];
        }
    },

    setCMDB: async (records: CMDBEntry[]): Promise<void> => {
        try {
            await localforage.setItem(CMDB_KEY, records);
        } catch (e) {
            console.error('Failed to save CMDB to localforage:', e);
        }
    },

    getAWSInventory: async (): Promise<any[]> => {
        return (await localforage.getItem(AWS_INV_KEY)) || [];
    },

    setAWSInventory: async (records: any[]): Promise<void> => {
        await localforage.setItem(AWS_INV_KEY, records);
    },

    getAzureInventory: async (): Promise<any[]> => {
        return (await localforage.getItem(AZURE_INV_KEY)) || [];
    },

    setAzureInventory: async (records: any[]): Promise<void> => {
        await localforage.setItem(AZURE_INV_KEY, records);
    },

    getCloudAgents: async (): Promise<any[]> => {
        return (await localforage.getItem(CLOUD_AGENT_KEY)) || [];
    },

    setCloudAgents: async (records: any[]): Promise<void> => {
        await localforage.setItem(CLOUD_AGENT_KEY, records);
    },

    getMetrics: async (): Promise<MetricSummary> => {
        const records = await db.getRecords();

        const summary: MetricSummary = {
            total: records.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            active: 0,
            fixed: 0,
            reopen: 0,
            slaBreached: 0,
            fixRate: 0,
        };

        if (records.length === 0) return summary;

        records.forEach(r => {
            // Severity
            if (r.severity === 'Critical') summary.critical++;
            else if (r.severity === 'High') summary.high++;
            else if (r.severity === 'Medium') summary.medium++;
            else if (r.severity === 'Low') summary.low++;

            // Status
            if (r.status === 'Active') summary.active++;
            else if (r.status === 'Fixed') summary.fixed++;
            else if (r.status === 'Reopen') summary.reopen++;

            // Simple SLA Breach mock check (e.g. Critical > 7 days, High > 30 days)
            if (r.status !== 'Fixed' && r.discoveryDate) {
                const daysOpen = (new Date().getTime() - new Date(r.discoveryDate).getTime()) / (1000 * 3600 * 24);
                if (r.severity === 'Critical' && daysOpen > 7) summary.slaBreached++;
                if (r.severity === 'High' && daysOpen > 30) summary.slaBreached++;
            }
        });

        summary.fixRate = Math.round((summary.fixed / summary.total) * 100);

        return summary;
    }
};
