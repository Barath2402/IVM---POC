import { useEffect, useState, useMemo } from 'react';
import { db } from '../utils/db';
import type { MetricSummary, VulnerabilityRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Activity, ShieldAlert, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = {
    Critical: '#dc2626', // red-600
    High: '#ea580c',     // orange-600
    Medium: '#eab308',   // yellow-500
    Low: '#3b82f6',      // blue-500
    Active: '#ef4444',
    Fixed: '#22c55e',
    Reopen: '#f97316',
    New: '#06b6d4',
    Exception: '#8b5cf6'
};

export function DashboardPage() {
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

    useEffect(() => {
        db.getRecords().then(setRecords);
    }, []);

    const filteredRecords = useMemo(() => {
        return selectedOwner ? records.filter(r => r.appOwner === selectedOwner) : records;
    }, [records, selectedOwner]);

    const metrics = useMemo(() => {
        if (filteredRecords.length === 0) return null;
        const summary: MetricSummary = {
            total: filteredRecords.length,
            critical: 0, high: 0, medium: 0, low: 0,
            active: 0, fixed: 0, reopen: 0,
            slaBreached: 0, fixRate: 0,
        };
        filteredRecords.forEach(r => {
            if (r.severity === 'Critical') summary.critical++;
            else if (r.severity === 'High') summary.high++;
            else if (r.severity === 'Medium') summary.medium++;
            else if (r.severity === 'Low') summary.low++;

            if (r.status === 'Active') summary.active++;
            else if (r.status === 'Fixed') summary.fixed++;
            else if (r.status === 'Reopen') summary.reopen++;

            if (r.status !== 'Fixed' && r.discoveryDate) {
                const daysOpen = (new Date().getTime() - new Date(r.discoveryDate).getTime()) / (1000 * 3600 * 24);
                if (r.severity === 'Critical' && daysOpen > 7) summary.slaBreached++;
                if (r.severity === 'High' && daysOpen > 30) summary.slaBreached++;
            }
        });
        summary.fixRate = Math.round((summary.fixed / summary.total) * 100) || 0;
        return summary;
    }, [filteredRecords]);

    const riskRatedCount = useMemo(() => {
        let count = 0;
        filteredRecords.forEach(r => {
            if (r.status !== 'Fixed') {
                if (r.severity === 'Critical') count += 1;
                else if (r.severity === 'High') count += 1;
                else if (r.severity === 'Medium') count += 1;
            }
        });
        return count;
    }, [filteredRecords]);

    const ownerStats = useMemo(() => {
        const map: Record<string, { total: number, riskScore: number, critical: number, zeroDays: number }> = {};
        records.forEach(r => {
            const owner = r.appOwner || 'Unassigned';
            if (!map[owner]) map[owner] = { total: 0, riskScore: 0, critical: 0, zeroDays: 0 };
            map[owner].total++;
            if (r.status !== 'Fixed') {
                if (r.isZeroDay) map[owner].zeroDays++;

                if (r.severity === 'Critical') {
                    map[owner].riskScore += 5;
                    map[owner].critical++;
                }
                else if (r.severity === 'High') map[owner].riskScore += 4;
                else if (r.severity === 'Medium') map[owner].riskScore += 3;
            }
        });
        return Object.entries(map).sort((a, b) => b[1].riskScore - a[1].riskScore);
    }, [records]);

    if (!metrics || records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">No Data Available</h2>
                <p className="text-sm text-muted-foreground">Please upload a vulnerability data sheet first.</p>
            </div>
        );
    }

    // Prepare Chart Data
    const severityData = [
        { name: 'Critical', value: metrics.critical, fill: COLORS.Critical },
        { name: 'High', value: metrics.high, fill: COLORS.High },
        { name: 'Medium', value: metrics.medium, fill: COLORS.Medium },
        { name: 'Low', value: metrics.low, fill: COLORS.Low },
    ];

    const statusData = [
        { name: 'Active', value: metrics.active, fill: COLORS.Active },
        { name: 'Fixed', value: metrics.fixed, fill: COLORS.Fixed },
        { name: 'Reopen', value: metrics.reopen, fill: COLORS.Reopen },
    ].filter(d => d.value > 0);

    // Group by Severity for Status Distribution Trend
    const severityMap = filteredRecords.reduce((acc, r) => {
        const s = r.severity;
        if (!acc[s]) acc[s] = {
            severity: s,
            Active: 0, Fixed: 0, Reopen: 0, New: 0, Exception: 0,
            Total: 0
        };

        if (r.status === 'Active') acc[s].Active++;
        if (r.status === 'Fixed') acc[s].Fixed++;
        if (r.status === 'Reopen') acc[s].Reopen++;
        if (r.status === 'New') acc[s].New++;
        if (r.status === 'Exception') acc[s].Exception++;

        acc[s].Total++;
        return acc;
    }, {} as Record<string, any>);

    const trendData = ['Critical', 'High', 'Medium', 'Low'].map(s => severityMap[s] || { severity: s, Active: 0, Fixed: 0, Reopen: 0, New: 0, Exception: 0, Total: 0 });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-md text-sm min-w-[200px] z-50">
                    <p className="font-bold mb-2 border-b pb-1">{label}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1 tracking-wider">Severity</p>
                            <p className="text-foreground flex justify-between"><span>Level:</span> <span className="font-bold">{data.severity}</span></p>
                            <p className="text-foreground flex justify-between mt-1"><span>Total:</span> <span className="font-bold">{data.Total}</span></p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px] uppercase font-bold mb-1 tracking-wider">Vuln Status</p>
                            <p className="text-red-500 flex justify-between"><span>Active:</span> <span className="font-bold">{data.Active}</span></p>
                            <p className="text-green-500 flex justify-between"><span>Fixed:</span> <span className="font-bold">{data.Fixed}</span></p>
                            <p className="text-orange-500 flex justify-between"><span>Reopen:</span> <span className="font-bold">{data.Reopen}</span></p>
                            <p className="text-cyan-500 flex justify-between"><span>New:</span> <span className="font-bold">{data.New}</span></p>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t font-bold flex justify-between">
                        <span>Total Records:</span>
                        <span>{data.Total}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Executive Summary</h2>
                    <p className="text-muted-foreground mt-1">Real-time vulnerability metrics for your organization.</p>
                </div>
                {selectedOwner && (
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filtered by: {selectedOwner}</span>
                        <button
                            onClick={() => setSelectedOwner(null)}
                            className="ml-2 bg-primary/20 hover:bg-primary/30 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                        >
                            &times;
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card className="col-span-1 lg:col-span-2 border-l-4 border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-foreground">Risk Rated Vulnerabilities</CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">{riskRatedCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total Active (Crit + High + Med)</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vulnerabilities</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Found in scans</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-600">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Open</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.critical}</div>
                        <p className="text-xs text-muted-foreground mt-1">Requires immediate patching (Rating: 5)</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{metrics.slaBreached}</div>
                        <p className="text-xs text-muted-foreground mt-1">Aged beyond standard policy</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Fix Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{metrics.fixRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Historical remediation</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-10">
                <Card className="col-span-12 lg:col-span-3 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="flex justify-between items-center">
                            <span>Vulnerabilities by Owner</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto max-h-[300px]">
                        <ul className="divide-y">
                            {ownerStats.map(([owner, stat]) => (
                                <li
                                    key={owner}
                                    className={`
                                        p-3 flex justify-between items-center cursor-pointer transition-colors
                                        hover:bg-muted/50 
                                        ${selectedOwner === owner ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}
                                    `}
                                    onClick={() => setSelectedOwner(owner === selectedOwner ? null : owner)}
                                >
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-sm truncate">{owner}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="font-bold text-sm">{stat.total} <span className="font-normal text-xs text-muted-foreground">vulns</span></div>
                                        {stat.zeroDays > 0 ? (
                                            <div className="text-[10px] text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-block mt-0.5">{stat.zeroDays} Zero-Day{stat.zeroDays > 1 ? 's' : ''}</div>
                                        ) : stat.critical > 0 ? (
                                            <div className="text-[10px] text-red-600 font-semibold">{stat.critical} Critical</div>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="col-span-12 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Discovery Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                <XAxis dataKey="severity" className="text-xs font-semibold" tick={{ fill: 'currentColor' }} />
                                <YAxis className="text-xs font-semibold" tick={{ fill: 'currentColor' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent', stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Line type="monotone" dataKey="Active" stroke={COLORS.Active} strokeWidth={2} name="Active" />
                                <Line type="monotone" dataKey="Fixed" stroke={COLORS.Fixed} strokeWidth={2} name="Fixed" />
                                <Line type="monotone" dataKey="Reopen" stroke={COLORS.Reopen} strokeWidth={2} name="Reopen" />
                                <Line type="monotone" dataKey="New" stroke={COLORS.New} strokeWidth={2} name="New" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-12 lg:col-span-3 flex flex-col">
                    <CardHeader className="pb-0">
                        <CardTitle>Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[260px] flex justify-center items-center pb-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Severity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={severityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'currentColor' }} className="text-xs font-medium" />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {severityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

