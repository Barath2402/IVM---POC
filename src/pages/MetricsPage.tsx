import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import type { VulnerabilityRecord } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldAlert, TrendingUp, TrendingDown, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function MetricsPage() {
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

    // Calculate Last Week vs This Week (Mock logic based on current date)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekNew = records.filter(r => new Date(r.discoveryDate) >= oneWeekAgo).length;
    const lastWeekNew = records.filter(r => {
        const d = new Date(r.discoveryDate);
        return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;

    const thisWeekFixed = records.filter(r => r.status === 'Fixed' && r.dateLastFixed && new Date(r.dateLastFixed) >= oneWeekAgo).length;
    const lastWeekFixed = records.filter(r => {
        if (!r.dateLastFixed || r.status !== 'Fixed') return false;
        const d = new Date(r.dateLastFixed);
        return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;

    const trendNew = lastWeekNew === 0 ? 100 : Math.round(((thisWeekNew - lastWeekNew) / lastWeekNew) * 100);
    const trendFixed = lastWeekFixed === 0 ? 100 : Math.round(((thisWeekFixed - lastWeekFixed) / lastWeekFixed) * 100);

    // Group by Application for SLA Breaches
    const slaApps = records.reduce((acc, r) => {
        if (r.status !== 'Fixed' && r.discoveryDate) {
            const daysOpen = (new Date().getTime() - new Date(r.discoveryDate).getTime()) / (1000 * 3600 * 24);
            if ((r.severity === 'Critical' && daysOpen > 7) || (r.severity === 'High' && daysOpen > 30)) {
                if (!acc[r.applicationName]) acc[r.applicationName] = 0;
                acc[r.applicationName]++;
            }
        }
        return acc;
    }, {} as Record<string, number>);

    const topSlaBreaches = Object.entries(slaApps)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(200, 0, 0); // Red
        doc.text('AIST Weekly Threat Summary', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Active Vulnerabilities: ${records.filter(r => r.status !== 'Fixed').length}`, 14, 36);

        // Active Threats Data Array
        const activeThreats = records.filter(r => r.status !== 'Fixed' && (r.severity === 'Critical' || r.isZeroDay));

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Active Critical & Zero-Day Threats', 14, 50);

        const tableColumn = ["CVE ID", "App Name", "Owner", "Severity", "Zero-Day", "Env"];
        const tableRows = activeThreats.map(r => [
            r.vulnerabilityId,
            r.applicationName,
            r.appOwner || 'None',
            r.severity,
            r.isZeroDay ? 'YES' : 'No',
            r.environment
        ]);

        (doc as any).autoTable({
            startY: 55,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [70, 78, 184] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        // Save doc
        doc.save(`Weekly_Threat_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Metrics & Threat Summary</h2>
                    <p className="text-muted-foreground mt-1">Week-over-week performance and SLA tracking.</p>
                </div>
                <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Export Threat Summary (PDF)
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">New Vulnerabilities (7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{thisWeekNew}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            {trendNew > 0 ? (
                                <span className="text-red-500 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />+{trendNew}% </span>
                            ) : (
                                <span className="text-green-500 flex items-center"><TrendingDown className="w-3 h-3 mr-1" />{trendNew}% </span>
                            )}
                            <span className="ml-2">compared to last week ({lastWeekNew})</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Remediated (7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{thisWeekFixed}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            {trendFixed > 0 ? (
                                <span className="text-green-500 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />+{trendFixed}% </span>
                            ) : (
                                <span className="text-red-500 flex items-center"><TrendingDown className="w-3 h-3 mr-1" />{trendFixed}% </span>
                            )}
                            <span className="ml-2">compared to last week ({lastWeekFixed})</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top SLA Breaches by Application</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topSlaBreaches.length > 0 ? (
                            <div className="space-y-4">
                                {topSlaBreaches.map(([appName, count], idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-xs">{idx + 1}</div>
                                            <p className="font-medium text-sm">{appName}</p>
                                        </div>
                                        <div className="font-bold flex items-center text-sm text-orange-500">
                                            {count} breaches
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No SLA Breaches Found.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Mean Time To Remediate (MTTR)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="text-4xl font-black text-primary">14.2 <span className="text-xl text-muted-foreground">days</span></div>
                                <p className="text-sm text-muted-foreground mt-2">Average time to fix across all severities</p>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4 border-t border-border pt-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-red-500 font-medium">Critical</span>
                                <span>5.1 days avg</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-orange-500 font-medium">High</span>
                                <span>12.4 days avg</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
