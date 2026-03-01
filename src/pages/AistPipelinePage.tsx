import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { db } from '../utils/db';
import { Server, Database, Activity, FileJson, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { VulnerabilityRecord, CMDBEntry } from '../types';

interface PipelineStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    icon: any;
}

export function AistPipelinePage() {
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);
    const [cmdbData, setCmdbData] = useState<CMDBEntry[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const [steps, setSteps] = useState<PipelineStep[]>([
        { id: 'ingest', title: '1. Data Ingestion', description: 'Load raw vulnerability intelligence feeds.', status: 'pending', icon: Server },
        { id: 'iasp', title: '2. IASP Enrichment', description: 'Calculate Intelligent Application Security Profiles.', status: 'pending', icon: Activity },
        { id: 'cmdb', title: '3. CMDB Correlation', description: 'Map owner and business context to technical flaws.', status: 'pending', icon: Database },
        { id: 'mid', title: '4. MID Consolidation', description: 'Generate unified master intelligent tracking file.', status: 'pending', icon: FileJson },
    ]);

    useEffect(() => {
        const loadAndRunPipeline = async () => {
            const loadedRecords = await db.getRecords();
            const loadedCmdb = await db.getCMDB();

            setRecords(loadedRecords);
            setCmdbData(loadedCmdb);

            if (loadedRecords.length === 0) return;

            // Simulate Pipeline Execution
            const updateStep = (id: string, status: 'pending' | 'running' | 'completed') => {
                setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
            };

            updateStep('ingest', 'running');
            await new Promise(r => setTimeout(r, 600));
            updateStep('ingest', 'completed');

            updateStep('iasp', 'running');
            await new Promise(r => setTimeout(r, 800));
            updateStep('iasp', 'completed');

            updateStep('cmdb', 'running');
            await new Promise(r => setTimeout(r, 700));

            // Map CMDB Data logic
            if (loadedCmdb.length > 0) {
                const enrichedRecords = loadedRecords.map(record => {
                    // Try to match by APIM ID, then Correlation ID, then App Name
                    const mappedCmdb = loadedCmdb.find(c =>
                        (c.apimId && record.apimId === c.apimId) ||
                        (c.applicationName && record.applicationName === c.applicationName)
                    );
                    if (mappedCmdb) {
                        return {
                            ...record,
                            appOwner: mappedCmdb.appOwner || record.appOwner,
                            businessOwner: mappedCmdb.businessOwner || 'Unassigned',
                            environment: mappedCmdb.environment ? (mappedCmdb.environment as any) : record.environment
                        };
                    }
                    return record;
                });
                setRecords(enrichedRecords);
                // We re-save to local storage so other components see the matched CMDB app owners
                await db.setRecords(enrichedRecords);
            }
            updateStep('cmdb', 'completed');

            updateStep('mid', 'running');
            await new Promise(r => setTimeout(r, 900));
            updateStep('mid', 'completed');
        };

        loadAndRunPipeline();
    }, []);

    const handleExportAIST = () => {
        if (records.length === 0) return;
        setIsExporting(true);

        const today = new Date().toISOString().split('T')[0];

        // 1. Raw Report
        const rawSheet = XLSX.utils.json_to_sheet(records.map(r => ({
            'CVE ID': r.vulnerabilityId,
            'Severity': r.severity,
            'Status': r.status,
            'APIM ID': r.apimId,
            'App Name': r.applicationName
        })));

        // 2. IASP Enriched Report
        const iaspSheet = XLSX.utils.json_to_sheet(records.map(r => ({
            'CVE ID': r.vulnerabilityId,
            'IASP Risk Score': r.iaspRiskScore,
            'Business Impact': r.businessImpact,
            'Environment Risk': r.environmentRisk,
            'Exploit Probability': r.exploitProbability,
            'Remediation Priority': r.remediationPriority,
            'SLA Category': r.slaCategory,
            'Patch ETA Recommendation': r.patchEtaRecommendation,
            'Escalation Required': r.escalationRequired ? 'Yes' : 'No'
        })));

        // 3. CMDB Correlated Report
        const cmdbSheet = XLSX.utils.json_to_sheet(records.map(r => ({
            'APIM ID': r.apimId,
            'App Name': r.applicationName,
            'App Owner': r.appOwner,
            'Business Owner': r.businessOwner || 'Unknown',
            'Environment': r.environment
        })));

        // 4. MID Consolidated Report
        const midSheet = XLSX.utils.json_to_sheet(records);

        // Build Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, rawSheet, `Raw_Report`);
        XLSX.utils.book_append_sheet(wb, iaspSheet, `IASP_Enriched`);
        XLSX.utils.book_append_sheet(wb, cmdbSheet, `CMDB_Correlated`);
        XLSX.utils.book_append_sheet(wb, midSheet, `MID_Consolidated`);

        // Generate and download
        XLSX.writeFile(wb, `AIST_Package_${today}.xlsx`);
        setIsExporting(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">AIST Execution Pipeline</h2>
                <p className="text-muted-foreground mt-2">
                    Advanced Intelligent Security Tracking Engine. This view monitors the automated enrichment
                    and correlation workflows and generates the required output directory structures.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                {steps.map((step) => (
                    <Card key={step.id} className={`
                        relative overflow-hidden transition-all duration-500
                        ${step.status === 'running' ? 'border-primary shadow-lg scale-105' : ''}
                        ${step.status === 'completed' ? 'bg-primary/5 border-primary/20' : ''}
                    `}>
                        {step.status === 'running' && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-primary animate-pulse" />
                        )}
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span className={step.status === 'completed' ? 'text-primary' : ''}>
                                    {step.title}
                                </span>
                                <step.icon className={`w-5 h-5 ${step.status === 'completed' ? 'text-primary' :
                                    step.status === 'running' ? 'text-blue-500 animate-pulse' :
                                        'text-muted-foreground'
                                    }`} />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
                                {step.status === 'pending' && <span className="text-muted-foreground">Waiting...</span>}
                                {step.status === 'running' && <span className="text-blue-500">Processing...</span>}
                                {step.status === 'completed' && <span className="text-green-500">Done</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="mt-8 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        AIST Artifact Generation
                    </CardTitle>
                    <CardDescription>
                        Export the fully enriched, correlated, and formatted Excel package containing the required sheets.
                        This replaces the manual folder creation step by bundling all required reports.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/50 p-6 rounded-lg border">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm">AIST_Package_{new Date().toISOString().split('T')[0]}.xlsx</h4>
                            <p className="text-xs text-muted-foreground">Contains Raw, IASP Enriched, CMDB Correlated, and MID Consolidated sets.</p>
                            <p className="text-xs text-muted-foreground font-mono mt-2">
                                Records processed: {records.length} | CMDB mappings applied: {cmdbData.length}
                            </p>
                        </div>
                        <button
                            onClick={handleExportAIST}
                            disabled={isExporting || steps.some(s => s.status !== 'completed')}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Generating...' : 'Download AIST Output'}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
