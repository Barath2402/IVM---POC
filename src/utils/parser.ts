import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { VulnerabilityRecord, Severity, Status, Environment } from '../types';

// Normalization mappings
const severityMap: Record<string, Severity> = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
    'crit': 'Critical',
};

const statusMap: Record<string, Status> = {
    'active': 'Active',
    'fixed': 'Fixed',
    'new': 'New',
    'exception': 'Exception',
    'reopen': 'Reopen',
    're-open': 'Reopen',
    'closed': 'Fixed',
};

const envMap: Record<string, Environment> = {
    'prod': 'Prod',
    'production': 'Prod',
    'uat': 'UAT',
    'dev': 'Dev',
    'development': 'Dev',
};

const mapRowToRecord = (row: any): VulnerabilityRecord => {
    // Validate and normalize core fields
    const rawSeverity = String(row['Risk Rating'] || row['Severity'] || '').toLowerCase().trim();
    const rawStatus = String(row['Vuln Status'] || row['Status'] || '').toLowerCase().trim();
    const rawEnv = String(row['Env'] || row['Environment'] || '').toLowerCase().trim();

    const severity = severityMap[rawSeverity] || 'Low';
    const status = statusMap[rawStatus] || 'Active';
    const environment = envMap[rawEnv] || 'Dev';

    // Core mapping
    return {
        id: uuidv4(),

        // Extended 54-column mappings
        ip: row['IP'] || '0.0.0.0',
        applicationName: row['Application Name'] || 'Unknown App',
        apimId: row['APM ID'] || row['APIM ID'] || `APIM-UNKNOWN-${Math.floor(Math.random() * 1000)}`,
        scanType: row['Scan Type'] || 'Unknown',
        dns: row['DNS'] || '',
        netBios: row['NetBIOS'] || '',
        trackingMethod: row['Tracking Method'] || 'IP',
        os: row['OS'] || 'Unknown',
        ipStatus: row['IP Status'] || 'Active',
        uniqueId: row['Unique id'] || uuidv4(),
        vulnerabilityName: row['Vulnerability Name'] || 'Unknown Vuln',
        vulnStatus: status,
        environment,
        pastDue: row['Past due'] || 'No',
        type: row['Type'] || 'Vuln',
        riskRating: severity,
        port: row['Port'] || '',
        protocol: row['Protocol'] || '',
        fqdn: row['FQDN'] || '',
        ssl: row['SSL'] || 'No',
        firstFoundDate: row['First Found date'] || row['Discovery Date'] || new Date().toISOString().split('T')[0],
        lastDetected: row['Last Detected'] || '',
        timesDetected: row['Times Detected'] || '1',
        dateLastFixed: row['Date Last Fixed'] || row['Fix Date'] || '',
        firstReopened: row['First Reopened'] || '',
        lastReopened: row['Last Reopened'] || '',
        timesReopened: row['Times Reopened'] || '0',
        vulnerabilityId: row['CVE ID'] || row['Vulnerability ID (CVE)'] || 'UNKNOWN',
        vendorReference: row['Vendor Reference'] || '',
        bugtraqId: row['Bugtraq ID'] || '',
        threat: row['Threat'] || '',
        impact: row['Impact'] || '',
        recommendation: row['Recommendation'] || '',
        exploitability: row['Exploitability'] || '',
        results: row['Results'] || '',
        pciVuln: row['PCI Vuln'] || 'No',
        ticketState: row['Ticket State'] || '',
        instance: row['Instance'] || '',
        category: row['Category'] || '',
        qds: row['QDS'] || '',
        ars: row['ARS'] || '',
        acs: row['ACS'] || '',
        truRiskScore: row['TruRisk Score'] || '0',
        ifOrPci: row['IF or PCI'] || '',
        source: row['Source'] || 'Scanner',
        sla: row['SLA'] || '',
        vulnerabilityAge: row['Vulnerability Age'] || '0',
        appOwner: row['App Owner'] || 'Unassigned',
        organization: row['Organization'] || 'Default Org',
        remediationTeamScope: row['Remediation Team Scope'] || 'Infrastructure',

        // Legacy / Normalized fields used throughout standard components
        severity,
        status,
        discoveryDate: row['First Found date'] || row['Discovery Date'] || new Date().toISOString().split('T')[0],
        componentVersion: row['Component / Library Version'] || 'Unknown',
    };
};

export const parseVulnerabilityData = async (file: File): Promise<VulnerabilityRecord[]> => {
    try {
        let records: VulnerabilityRecord[] = [];

        if (file.name.endsWith('.csv')) {
            records = await new Promise<VulnerabilityRecord[]>((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        resolve(results.data.map(mapRowToRecord));
                    },
                    error: reject
                });
            });
        } else if (file.name.endsWith('.xlsx')) {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            records = data.map(mapRowToRecord);
        } else {
            throw new Error('Unsupported file type');
        }

        return records.map(calculateRiskScore);
    } catch (error) {
        throw error;
    }
};

const calculateRiskScore = (record: VulnerabilityRecord): VulnerabilityRecord => {
    let score = 0;

    // Severity weight
    const severityWeights = { Critical: 10, High: 7, Medium: 4, Low: 1 };
    score += severityWeights[record.severity] * 10;

    // Environment weight
    const envWeights = { Prod: 50, UAT: 20, Dev: 5 };
    score += envWeights[record.environment];

    // Reopen penalty
    if (record.status === 'Reopen') score += 20;

    // Mock zero-day logic & Exploit logic
    let isZeroDay = false;
    let hasExploit = false;
    let isKevListed = false;

    if ((record.severity === 'Critical' || record.severity === 'High') && record.vulnerabilityId.startsWith('CVE')) {
        const hash = record.vulnerabilityId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);

        if (Math.abs(hash) % 20 === 0) {
            isZeroDay = true;
            score += 100;
        }
        if (Math.abs(hash) % 5 === 0) {
            hasExploit = true;
            score += 30;
        }
        if (Math.abs(hash) % 15 === 0) {
            isKevListed = true;
            score += 50;
        }
    }

    // Normalize max score to roughly 0-100+ range
    record.riskScore = Math.min(Math.max(score, 0), 200);
    record.isZeroDay = isZeroDay;
    record.hasExploit = hasExploit;
    record.isKevListed = isKevListed;

    // IASP Simulated Enrichment
    record.iaspRiskScore = record.riskScore + (parseInt(record.truRiskScore) || 0) / 10;
    record.businessImpact = record.environment === 'Prod' ? 'High' : 'Low';
    record.environmentRisk = record.environment;
    record.exploitProbability = hasExploit ? 'High' : (isZeroDay ? 'Critical' : 'Low');
    record.remediationPriority = record.severity === 'Critical' || isZeroDay ? 'P1' : 'P3';
    record.slaCategory = record.sla || 'Standard 30 Days';

    if (isZeroDay) record.patchEtaRecommendation = 'Immediate (0-24 Hrs)';
    else if (record.severity === 'Critical') record.patchEtaRecommendation = '7 Days';
    else record.patchEtaRecommendation = '30-90 Days';

    record.escalationRequired = isZeroDay || (record.environment === 'Prod' && isKevListed);

    return record;
};
