import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import type { VulnerabilityRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldAlert, Server, Target } from 'lucide-react';

export function SecurityPage() {
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);

    useEffect(() => {
        db.getRecords().then(setRecords);
    }, []);

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">No Data Available</h2>
            </div>
        );
    }

    // 1. Top 10 High-Risk Applications
    const appRiskMap = records.reduce((acc, r) => {
        if (r.status !== 'Fixed') {
            if (!acc[r.applicationName]) acc[r.applicationName] = 0;
            acc[r.applicationName] += (r.riskScore || 0);
        }
        return acc;
    }, {} as Record<string, number>);

    const topApps = Object.entries(appRiskMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // 2. Risk Heat Map (Severity vs Environment)
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const envs = ['Prod', 'UAT', 'Dev'];

    const heatMapData = envs.map(env => {
        const row: Record<string, any> = { env };
        severities.forEach(sev => {
            row[sev] = records.filter(r => r.environment === env && r.severity === sev && r.status !== 'Fixed').length;
        });
        return row;
    });

    const getHeatmapColor = (count: number) => {
        if (count === 0) return 'bg-muted/50 text-muted-foreground';
        if (count < 5) return 'bg-yellow-500/20 text-yellow-600';
        if (count < 15) return 'bg-orange-500/40 text-orange-700 font-bold';
        return 'bg-red-600 opacity-90 text-white font-bold';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Security Posture</h2>
                <p className="text-muted-foreground mt-1">High-risk application views and environmental heat maps.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Top Risk Apps list */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Top 10 Risk Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topApps.map(([appName, score], idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Server className="w-4 h-4 text-muted-foreground" />
                                        <p className="font-medium text-sm truncate w-32" title={appName}>{appName}</p>
                                    </div>
                                    <div className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md">
                                        Risk Score: {Math.round(score)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Heat Map & Zero Day Hits */}
                <div className="col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Environment Heat Map (Active Vulns)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-center border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-3 border-b text-left text-muted-foreground font-medium">Environment</th>
                                            {severities.map(sev => <th key={sev} className="p-3 border-b text-muted-foreground font-medium">{sev}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {heatMapData.map(row => (
                                            <tr key={row.env}>
                                                <td className="p-3 border-b text-left font-medium">{row.env}</td>
                                                {severities.map(sev => (
                                                    <td key={sev} className="p-2 border-b">
                                                        <div className={`py-2 rounded-md ${getHeatmapColor(row[sev])}`}>
                                                            {row[sev]}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-500/50 bg-red-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-red-500 flex items-center gap-2">
                                <Target className="w-5 h-5" /> Active Zero-Day Exposures
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mt-2">
                                <div>
                                    <p className="text-sm font-medium">Critical Zero-Days in Production</p>
                                    <p className="text-xs text-muted-foreground mt-1">Requires immediate patching.</p>
                                </div>
                                <div className="text-3xl font-black text-red-600">
                                    {records.filter(r => r.isZeroDay && r.environment === 'Prod' && r.status !== 'Fixed').length}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
