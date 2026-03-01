import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import type { VulnerabilityRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { SplitSquareHorizontal, Download, Filter, FileSpreadsheet, Archive } from 'lucide-react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function ApimSplitPage() {
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);
    const [apimIds, setApimIds] = useState<string[]>([]);
    const [selectedApim, setSelectedApim] = useState<string>('');

    useEffect(() => {
        db.getRecords().then(data => {
            setRecords(data);
            const uniqueApims = Array.from(new Set(data.map(r => r.apimId))).sort();
            setApimIds(uniqueApims);
            if (uniqueApims.length > 0) {
                setSelectedApim(uniqueApims[0]);
            }
        });
    }, []);

    const mapToStandardExport = (r: VulnerabilityRecord) => ({
        'IP': r.ip,
        'Application Name': r.applicationName,
        'APIM ID': r.apimId,
        'Scan Type': r.scanType,
        'DNS': r.dns,
        'NetBIOS': r.netBios,
        'Tracking Method': r.trackingMethod,
        'OS': r.os,
        'IP Status': r.ipStatus,
        'Unique id': r.uniqueId,
        'Vulnerability Name': r.vulnerabilityName,
        'Vuln Status': r.vulnStatus,
        'Env': r.environment,
        'Past due': r.pastDue,
        'Type': r.type,
        'Risk Rating': r.riskRating,
        'Port': r.port,
        'Protocol': r.protocol,
        'FQDN': r.fqdn,
        'SSL': r.ssl,
        'First Found date': r.firstFoundDate,
        'Last Detected': r.lastDetected,
        'Times Detected': r.timesDetected,
        'Date Last Fixed': r.dateLastFixed,
        'First Reopened': r.firstReopened,
        'Last Reopened': r.lastReopened,
        'Times Reopened': r.timesReopened,
        'CVE ID': r.vulnerabilityId,
        'Vendor Reference': r.vendorReference,
        'Bugtraq ID': r.bugtraqId,
        'Threat': r.threat,
        'Impact': r.impact,
        'Recommendation': r.recommendation,
        'Exploitability': r.exploitability,
        'Results': r.results,
        'PCI Vuln': r.pciVuln,
        'Ticket State': r.ticketState,
        'Instance': r.instance,
        'Category': r.category,
        'QDS': r.qds,
        'ARS': r.ars,
        'ACS': r.acs,
        'TruRisk Score': r.truRiskScore,
        'IF or PCI': r.ifOrPci,
        'Source': r.source,
        'SLA': r.sla,
        'Vulnerability Age': r.vulnerabilityAge,
        'App Owner': r.appOwner,
        'Organization': r.organization,
        'Remediation Team Scope': r.remediationTeamScope
    });

    const handleDownload = (apimId: string) => {
        const filteredData = records.filter(r => r.apimId === apimId).map(mapToStandardExport);

        const csv = Papa.unparse(filteredData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `IVM_Export_${apimId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = async () => {
        if (apimIds.length === 0) return;

        const zip = new JSZip();
        apimIds.forEach(apimId => {
            const filteredData = records.filter(r => r.apimId === apimId).map(mapToStandardExport);
            const csv = Papa.unparse(filteredData);
            zip.file(`APIM_${apimId}.csv`, csv);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'All_APIM_Splits.zip');
    };

    const selectedRecords = records.filter(r => r.apimId === selectedApim);

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <SplitSquareHorizontal className="w-16 h-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">No Data to Split</h2>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary rounded-full text-secondary-foreground ring-4 ring-secondary/50">
                    <SplitSquareHorizontal className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">APIM Split Utility</h2>
                    <p className="text-muted-foreground mt-1">Isolate and export vulnerability views per Application ID.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4 mt-8">
                <Card className="md:col-span-1 h-fit relative">
                    <CardHeader className="bg-muted/50 rounded-t-lg border-b">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Filter className="w-4 h-4" /> Filter by APIM
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col max-h-[500px] overflow-y-auto w-full">
                            {apimIds.map(apim => (
                                <button
                                    key={apim}
                                    onClick={() => setSelectedApim(apim)}
                                    className={`
                     w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b last:border-0
                     ${selectedApim === apim
                                            ? 'bg-primary/10 text-primary border-l-4 border-l-primary'
                                            : 'hover:bg-muted text-muted-foreground border-l-4 border-l-transparent'}
                   `}
                                >
                                    {apim}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="text-xl text-primary font-bold tracking-tight mb-2">Dataset: {selectedApim}</CardTitle>
                            <CardDescription>
                                {selectedRecords.length} vulnerabilities isolated for this application group.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
                            >
                                <Archive className="w-4 h-4" /> Download All ZIP
                            </button>
                            <button
                                onClick={() => handleDownload(selectedApim)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            <div className="p-4 rounded-lg bg-accent/40 border flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold">
                                    {selectedRecords.filter(r => r.severity === 'Critical' && r.status !== 'Fixed').length}
                                </div>
                                <div className="text-sm font-medium">Critical Open</div>
                            </div>
                            <div className="p-4 rounded-lg bg-accent/40 border flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                                    {selectedRecords.filter(r => r.severity === 'High' && r.status !== 'Fixed').length}
                                </div>
                                <div className="text-sm font-medium">High Open</div>
                            </div>
                            <div className="p-4 rounded-lg bg-accent/40 border flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
                                    {selectedRecords.filter(r => r.status === 'Fixed').length}
                                </div>
                                <div className="text-sm font-medium">Remediated</div>
                            </div>
                        </div>

                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">CVE / ID</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Env</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Discovery Focus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedRecords.slice(0, 8).map(r => (
                                        <tr key={r.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono font-medium text-xs">{r.vulnerabilityId}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                              ${r.severity === 'Critical' ? 'bg-red-500/10 text-red-600' : ''}
                              ${r.severity === 'High' ? 'bg-orange-500/10 text-orange-600' : ''}
                              ${r.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-600' : ''}
                              ${r.severity === 'Low' ? 'bg-blue-500/10 text-blue-600' : ''}
                            `}>
                                                    {r.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                              ${r.status === 'Active' ? 'border-red-200 text-red-600 bg-red-50' : ''}
                              ${r.status === 'Fixed' ? 'border-green-200 text-green-600 bg-green-50' : ''}
                              ${r.status === 'Reopen' ? 'border-orange-200 text-orange-600 bg-orange-50' : ''}
                            `}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{r.environment}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{r.discoveryDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {selectedRecords.length > 8 && (
                                <div className="bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground border-t flex items-center justify-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4" /> Expand by downloading full CSV report above.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
