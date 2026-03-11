import { useEffect, useState } from 'react';
import { db } from '../utils/db';
import type { VulnerabilityRecord } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Bot, Bug, AlertTriangle, Lightbulb, MessageSquare, Send, CheckCircle } from 'lucide-react';

interface Insight {
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    cve?: string;
    appName?: string;
    appOwner?: string;
}

interface Alert {
    id: string;
    type: 'email' | 'teams';
    cve: string;
    appName: string;
    appOwner: string;
    severity: string;
    isZeroDay: boolean;
    isKevListed: boolean;
    recommendation: string;
    timestamp: string;
}

export function AgentInsightsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [records, setRecords] = useState<VulnerabilityRecord[]>([]);

    const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string; }[]>([
        { role: 'agent', text: 'Hello! I am the AIST Security Assistant. I can scan your customized dashboard and provide specific remediation recommendations based on the 54-column IASP schema. Ask me about a CVE, Application, App Owner, or APM ID!' }
    ]);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        setIsLoading(true);
        // Add artificial delay to show engaging loading animation as per requirement
        setTimeout(() => {
            db.getRecords().then(data => {
                setRecords(data);
                generateInsights(data);
                setIsLoading(false);
            });
        }, 1500);
    }, []);

    const generateInsights = (data: VulnerabilityRecord[]) => {
        const newInsights: Insight[] = [];

        // 1. Zero-Day in Prod
        const prodZeroDays = data.filter(r => r.isZeroDay && r.environment === 'Prod' && r.status !== 'Fixed');
        if (prodZeroDays.length > 0) {
            newInsights.push({
                id: '1',
                type: 'critical',
                message: `Found ${prodZeroDays.length} actively exploited Zero-Day(s) in Production. Immediate patch required for ${prodZeroDays.map(r => r.applicationName).join(', ')}.`
            });
        }

        // 2. Repeated Reopen logic
        const reopenApps = data.filter(r => r.status === 'Reopen').reduce((acc, r) => {
            acc[r.apimId] = (acc[r.apimId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(reopenApps).forEach(([apimId, count], idx) => {
            if (count > 2) {
                newInsights.push({
                    id: `reopen-${idx}`,
                    type: 'warning',
                    message: `${apimId} shows a pattern of repeated reopens (${count} instances) — possible ineffective fix or pipeline regression.`
                });
            }
        });

        // 3. High Risk Average
        const appScores = data.reduce((acc, r) => {
            if (r.status !== 'Fixed') {
                if (!acc[r.applicationName]) acc[r.applicationName] = { score: 0, count: 0 };
                acc[r.applicationName].score += (r.riskScore || 0);
                acc[r.applicationName].count++;
            }
            return acc;
        }, {} as Record<string, { score: number, count: number }>);

        Object.entries(appScores).forEach(([appName, stats], idx) => {
            const avgScore = stats.count > 0 ? stats.score / stats.count : 0;
            if (avgScore > 80 && stats.count > 5) {
                newInsights.push({
                    id: `risk-${idx}`,
                    type: 'info',
                    message: `Application ${appName} has an exceptionally high average risk score (${Math.round(avgScore)}) across ${stats.count} active vulnerabilities.`
                });
            }
        });

        setInsights(newInsights);

        // --- AIST Simulated Alerting Engine ---
        const newAlerts: Alert[] = [];

        // Find triggers: Severity = Critical OR Zero-Day = Yes OR KEV Listed
        data.forEach((r, idx) => {
            // Only alert if active
            if (r.status === 'Fixed') return;

            if (r.severity === 'Critical' || r.isZeroDay || r.isKevListed) {
                // Limit mock alerts to the first 5 to avoid UI spam in this simulation
                if (newAlerts.length < 5) {
                    newAlerts.push({
                        id: `alert-${idx}`,
                        type: idx % 2 === 0 ? 'email' : 'teams', // Alternate mock formatting
                        cve: r.vulnerabilityId,
                        appName: r.applicationName,
                        appOwner: r.appOwner || 'Unassigned',
                        severity: r.severity,
                        isZeroDay: r.isZeroDay || false,
                        isKevListed: r.isKevListed || false,
                        recommendation: r.patchEtaRecommendation || 'Immediate patching required.',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        setAlerts(newAlerts);
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessages = [...messages, { role: 'user' as const, text: chatInput }];
        setMessages(newMessages);
        setChatInput('');

        // Simple mock logic: look for CVE or App Name in input
        setTimeout(() => {
            const query = chatInput.toLowerCase();
            const matchingRecords = records.filter(r =>
                r.vulnerabilityId.toLowerCase().includes(query) ||
                r.applicationName.toLowerCase().includes(query) ||
                (r.appOwner && r.appOwner.toLowerCase().includes(query)) ||
                (r.apimId && r.apimId.toLowerCase().includes(query))
            );

            let agentResponse = '';
            if (matchingRecords.length > 0) {
                const r = matchingRecords[0];
                agentResponse = `Based on the sheet data for **${r.vulnerabilityId}** (${r.applicationName}) assigned to **${r.appOwner || 'Unassigned'}**: it is marked as a **${r.severity}** severity in ${r.environment}. \n\n**AIST Recommendation**: ${r.recommendation || r.patchEtaRecommendation || 'Apply vendor patches immediately.'}`;
            } else if (query.includes('critical')) {
                const count = records.filter(r => r.severity === 'Critical' && r.status !== 'Fixed').length;
                agentResponse = `There are currently ${count} open critical vulnerabilities. Let me know if you want remediation strategies for a specific app owner.`;
            } else if (query.includes('zero day') || query.includes('zero-day')) {
                const count = records.filter(r => r.isZeroDay && r.status !== 'Fixed').length;
                agentResponse = `We are tracking ${count} active zero-day vulnerabilities in the system right now.`;
            } else {
                agentResponse = "I couldn't find a direct match for that query in the uploaded vulnerability database. Please try providing an exact CVE ID, Application Name, or App Owner.";
            }

            setMessages(prev => [...prev, { role: 'agent', text: agentResponse }]);
        }, 600);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <Bot className="w-10 h-10 text-primary absolute inset-0 m-auto" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        AIST Agent Analyzing Data...
                    </h2>
                    <p className="text-sm text-muted-foreground transition-opacity animate-pulse">Running advanced vulnerability heuristics</p>
                </div>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Bot className="w-16 h-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">No Agent Data</h2>
                <p className="text-sm text-muted-foreground">Please upload a vulnerability data sheet first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto h-full overflow-y-auto pb-12">

            {/* Agent Information Header */}
            <div className="flex items-center gap-4 border-b pb-6">
                <div className="p-4 bg-primary/10 rounded-full text-primary ring-4 ring-primary/5 shadow-sm">
                    <Bot className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">AI Agent Assistant</h2>
                    <p className="text-muted-foreground mt-1 text-base">Direct chat interface and automated alerting powered by AIST algorithms.</p>
                </div>
            </div>

            {/* Top Section: Agent Interactive Chat */}
            <div className="border rounded-xl bg-card shadow-md flex flex-col h-[400px] overflow-hidden">
                <div className="bg-primary/95 p-4 text-primary-foreground border-b border-primary-foreground/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-6 h-6" />
                        <div>
                            <h3 className="font-bold">AIST Intelligent Chat Agent</h3>
                            <p className="text-xs text-primary-foreground/80 font-medium">Ask for recommendations from your uploaded sheet</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm shadow-sm border ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm border-primary' : 'bg-card text-card-foreground rounded-bl-sm border-border'}`}>
                                {msg.text.split('\n').map((line, i) => (
                                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                        {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : part)}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleChatSubmit} className="p-3 border-t bg-card flex gap-3">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="E.g. What is the recommendation for Critical vulnerabilities?"
                        className="flex-1 bg-muted/50 border border-muted-foreground/20 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>

            {/* Bottom Section: Unified Insights & Alerts Layout */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Lightbulb className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />
                            Generated Insights & Alerts
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">Heuristic discoveries and simulated dispatch based on current data.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 items-start">

                    {/* Insights Column */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-foreground/80 border-b pb-2 flex items-center gap-2">
                            <Bot className="w-5 h-5" /> Heuristic Analysis
                        </h4>

                        {insights.length === 0 ? (
                            <Card className="border-green-500/30 bg-green-500/5 shadow-sm">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                                    <CheckCircle className="w-10 h-10 text-green-500/50" />
                                    <p className="text-base font-medium">All clear! No critical insights detected.</p>
                                    <p className="text-sm text-muted-foreground">The agent found no major SLA violations or repeated reopens.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-3">
                                {insights.map((insight) => (
                                    <Card
                                        key={insight.id}
                                        className={`
                                            shadow-sm transition-all hover:shadow-md border-l-4 
                                            ${insight.type === 'critical' ? 'border-l-red-600 bg-red-600/5 dark:bg-red-900/10' : ''}
                                            ${insight.type === 'warning' ? 'border-l-orange-500 bg-orange-500/5 dark:bg-orange-900/10' : ''}
                                            ${insight.type === 'info' ? 'border-l-blue-500 bg-blue-500/5 dark:bg-blue-900/10' : ''}
                                        `}
                                    >
                                        <CardContent className="flex items-start gap-3 p-4">
                                            {insight.type === 'critical' && <Bug className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />}
                                            {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />}
                                            {insight.type === 'info' && <Lightbulb className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />}
                                            <div className="space-y-1">
                                                <p className="font-semibold text-sm leading-none uppercase tracking-wide text-foreground">
                                                    {insight.type === 'critical' ? 'Critical Alert' : insight.type === 'warning' ? 'Warning' : 'Insight'}
                                                </p>
                                                <p className="text-muted-foreground text-sm">{insight.message}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alerts Column */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-foreground/80 border-b pb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Active Alert Dispatch
                        </h4>

                        {alerts.length === 0 ? (
                            <Card className="border-border bg-muted/10 shadow-sm">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                                    <p className="text-base font-medium text-muted-foreground">No active triggers.</p>
                                    <p className="text-sm text-muted-foreground">Simulated alerting system is quiet.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="relative group transition-all hover:-translate-y-1">
                                        {alert.type === 'email' ? (
                                            <div className="border rounded-xl bg-card shadow-sm overflow-hidden text-sm">
                                                <div className="bg-muted/50 dark:bg-muted/20 p-3 border-b flex items-center justify-between">
                                                    <span className="font-semibold text-muted-foreground flex items-center gap-2">
                                                        📧 AIST Automated Email
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    <div className="text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground">To:</span> {alert.appOwner}@client.com<br />
                                                        <span className="font-medium text-red-600 dark:text-red-500">Subject: 🚨 Critical Vulnerability Detected – Action Required</span>
                                                    </div>
                                                    <div className="p-3 bg-muted/30 dark:bg-muted/10 rounded border border-border/50 text-foreground/80 text-xs">
                                                        <p className="text-foreground">Hello {alert.appOwner},</p>
                                                        <p className="mt-2 text-foreground">The AIST platform has detected a severe security flaw impacting your application:</p>
                                                        <ul className="list-disc pl-5 mt-2 space-y-1 font-medium text-foreground">
                                                            <li><span className="text-muted-foreground font-normal">App:</span> {alert.appName}</li>
                                                            <li><span className="text-muted-foreground font-normal">CVE:</span> {alert.cve}</li>
                                                            {alert.isZeroDay && <li className="text-red-600 dark:text-red-500 flex gap-1 items-center">Includes Zero-Day Exploits <Bug className="w-3 h-3" /></li>}
                                                        </ul>
                                                        <p className="mt-3 border-l-2 pl-3 border-primary bg-primary/5 py-1.5 px-2 rounded-r text-foreground">
                                                            <strong className="text-foreground">Action Needed:</strong> {alert.recommendation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border rounded-xl bg-card shadow-sm overflow-hidden text-sm relative">
                                                <div className="bg-[#464EB8] p-3 border-b flex items-center justify-between text-white">
                                                    <span className="font-semibold flex items-center gap-2">
                                                        💬 MS Teams Adaptive Card
                                                    </span>
                                                    <span className="text-xs opacity-80">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="p-4 space-y-3 text-foreground">
                                                    <div className="flex gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 shadow-sm border border-red-200 dark:border-red-800/50">
                                                            <Bot className="w-6 h-6 text-red-600 dark:text-red-500" />
                                                        </div>
                                                        <div className="space-y-1 w-full">
                                                            <h4 className="font-bold text-sm text-foreground">AIST Security Bot</h4>
                                                            <div className="bg-muted/80 dark:bg-muted/20 p-3 rounded-lg border border-border/50">
                                                                <p className="font-bold text-red-600 dark:text-red-500 flex items-center gap-2 text-xs">
                                                                    <AlertTriangle className="w-3.5 h-3.5" /> Security Alert: {alert.cve}
                                                                </p>
                                                                <p className="mt-1.5 text-muted-foreground text-xs leading-tight">
                                                                    Direct ping for <span className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded font-medium">@{alert.appOwner}</span>
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                                                                    <div className="bg-background px-2 py-1.5 rounded border shadow-sm">
                                                                        <span className="text-muted-foreground block text-[10px] uppercase">App</span>
                                                                        <span className="font-semibold truncate block text-foreground" title={alert.appName}>{alert.appName}</span>
                                                                    </div>
                                                                    <div className="bg-background px-2 py-1.5 rounded border shadow-sm">
                                                                        <span className="text-muted-foreground block text-[10px] uppercase">Severity</span>
                                                                        <span className="font-bold text-red-600 dark:text-red-500">{alert.severity}</span>
                                                                    </div>
                                                                </div>
                                                                <button className="w-full mt-3 bg-[#464EB8] hover:bg-[#3b429e] text-white py-1.5 rounded transition-colors font-medium text-xs shadow-sm">
                                                                    Acknowledge Alert
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
