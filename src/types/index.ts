export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Active' | 'Fixed' | 'New' | 'Exception' | 'Reopen';
export type Environment = 'Prod' | 'UAT' | 'Dev';

export interface VulnerabilityRecord {
    id: string; // UUID generated on import

    // Core 54-Column Schema imports
    ip: string;
    applicationName: string;
    apimId: string;
    scanType: string;
    dns: string;
    netBios: string;
    trackingMethod: string;
    os: string;
    ipStatus: string;
    uniqueId: string;
    vulnerabilityName: string;
    vulnStatus: Status;
    environment: Environment;
    pastDue: string;
    type: string;
    riskRating: Severity;
    port: string;
    protocol: string;
    fqdn: string;
    ssl: string;
    firstFoundDate: string;
    lastDetected: string;
    timesDetected: string;
    dateLastFixed: string;
    firstReopened: string;
    lastReopened: string;
    timesReopened: string;
    vulnerabilityId: string; // CVE ID
    vendorReference: string;
    bugtraqId: string;
    threat: string;
    impact: string;
    recommendation: string;
    exploitability: string;
    results: string;
    pciVuln: string;
    ticketState: string;
    instance: string;
    category: string;
    qds: string;
    ars: string;
    acs: string;
    truRiskScore: string;
    ifOrPci: string;
    source: string;
    sla: string;
    vulnerabilityAge: string;
    appOwner: string;
    organization: string;
    remediationTeamScope: string;

    // Agent Enriched & Computed Fields
    severity: Severity; // mapped from Risk Rating
    status: Status; // mapped from Vuln Status
    discoveryDate: string; // mapped from First Found Date
    componentVersion: string; // Extracted or mapped
    riskScore?: number;
    isZeroDay?: boolean;
    isKevListed?: boolean;
    hasExploit?: boolean;

    // IASP Enriched Columns
    iaspRiskScore?: number;
    businessImpact?: string;
    environmentRisk?: string;
    exploitProbability?: string;
    remediationPriority?: string;
    slaCategory?: string;
    patchEtaRecommendation?: string;
    escalationRequired?: boolean;

    // CMDB Correlation Data
    correlationId?: string;
    businessOwner?: string;
}

export interface CMDBEntry {
    applicationName: string;
    apimId: string;
    correlationId: string;
    appOwner: string;
    businessOwner: string;
    environment: string;
}

export interface AWSInventoryEntry {
    ip: string;
    instanceId: string;
    environment: string;
    region: string;
}

export interface AzureInventoryEntry {
    ip: string;
    resourceId: string;
    environment: string;
    location: string;
}

export interface CloudAgentEntry {
    ip: string;
    agentId: string;
    lastCheckedIn: string; // ISO or date string
    status: string;
}

export interface InventoryComparisonResult {
    matchedIps: string[];
    missingFromInventory: string[]; // In Cloud Agent but not in AWS/Azure
    environmentCounts: {
        aws: Record<string, number>;
        azure: Record<string, number>;
    };
    notReportingAgents: CloudAgentEntry[];
}

export interface AgentAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    cve: string;
    appOwner: string;
    appName: string;
    recommendation: string;
}

export interface MetricSummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    active: number;
    fixed: number;
    reopen: number;
    slaBreached: number;
    fixRate: number;
}
