import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import type { VulnerabilityRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Target, Activity, ChevronRight } from 'lucide-react';

export function ZeroDayTrackerPage() {
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);

    useEffect(() => {
        db.getRecords().then(setRecords);
    }, []);

    const zeroDays = records.filter(r => r.isZeroDay && r.status !== 'Fixed');
    const prodZeroDays = zeroDays.filter(r => r.environment === 'Prod');

    const topAppNames = Object.entries(zeroDays.reduce((acc, r) => {
        acc[r.applicationName] = (acc[r.applicationName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);

    const topAppOwners = Object.entries(zeroDays.reduce((acc, r) => {
        const owner = r.appOwner || 'Unassigned';
        acc[owner] = (acc[owner] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);

    const topApp = topAppNames[0] || ['None', 0];
    const topOwner = topAppOwners[0] || ['None', 0];

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Target className="w-16 h-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">No Zero-Day Data</h2>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-red-600/10 rounded-full text-red-600 ring-4 ring-red-600/5 cursor-pointer hover:bg-red-600/20 transition-colors">
                    <Target className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-red-600">Zero-Day Intelligence</h2>
                    <p className="text-muted-foreground mt-1">Real-time exploit availability and active threat tracking.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-red-600 shadow-md shadow-red-600/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-red-600">Active Critical Threats (Prod)</CardTitle>
                        <CardDescription>Zero-Days requiring immediate intervention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-red-600">{prodZeroDays.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Total Identified Threats</CardTitle>
                        <CardDescription>Across all environments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-foreground">{zeroDays.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Top Affected Application</CardTitle>
                        <CardDescription>Most targeted system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground truncate" title={topApp[0]}>{topApp[0]}</div>
                        <p className="text-xs text-muted-foreground">{topApp[1]} Zero-Days Logged</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2">
                        <CardTitle>Top App Owner</CardTitle>
                        <CardDescription>Responsible for remediation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 truncate" title={topOwner[0]}>{topOwner[0]}</div>
                        <p className="text-xs text-muted-foreground">{topOwner[1]} Zero-Days Assigned</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8 relative overflow-hidden rounded-xl border border-border/50 bg-card ">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        Live Threat Feed
                    </h3>
                    <div className="space-y-4">
                        {zeroDays.length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">No active zero-days identified in the uploaded schema.</p>
                        ) : (
                            zeroDays.map((zd) => {
                                const isCVE = zd.vulnerabilityId?.startsWith('CVE-');
                                return (
                                    <div key={zd.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-colors border-l-4 border-l-red-600 gap-4 shadow-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold font-mono tracking-tight text-red-700 dark:text-red-400 text-lg">{zd.vulnerabilityId}</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-600 text-white uppercase animate-pulse">
                                                    Exploit Available
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1">
                                                <span className="font-semibold text-muted-foreground uppercase text-xs">App:</span> <span className="font-medium text-foreground">{zd.applicationName}</span>
                                                <span className="text-muted-foreground mx-2">|</span>
                                                <span className="font-semibold text-muted-foreground uppercase text-xs">Env:</span> <span className={zd.environment === 'Prod' ? 'font-bold text-orange-500' : 'text-foreground'}>{zd.environment}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                                                <span className="bg-muted px-2 py-1 rounded border border-border/50">Lib: {zd.componentVersion || 'N/A'}</span>
                                                <span className="bg-muted px-2 py-1 rounded border border-border/50 text-blue-600 dark:text-blue-400">Owner: {zd.appOwner || 'Unassigned'}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            <a
                                                href={isCVE ? `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(zd.vulnerabilityId)}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                                            >
                                                Patch Steps <ChevronRight className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full" />
            </div>
        </div>
    );
}
