import { useState, useEffect } from 'react';
import { 
    UploadCloud, 
    CheckCircle, 
    AlertCircle, 
    Server, 
    Cloud, 
    Shield, 
    Download, 
    ClipboardList,
    ExternalLink,
    Clock,
    Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { db } from '../utils/db';
import { parseInventoryFile, mapAwsRow, mapAzureRow, mapCloudAgentRow } from '../utils/inventoryParser';
import type { AWSInventoryEntry, AzureInventoryEntry, CloudAgentEntry, InventoryComparisonResult } from '../types';
import * as XLSX from 'xlsx';

export function InventoryPage() {
    const [awsInventory, setAwsInventory] = useState<AWSInventoryEntry[]>([]);
    const [azureInventory, setAzureInventory] = useState<AzureInventoryEntry[]>([]);
    const [cloudAgents, setCloudAgents] = useState<CloudAgentEntry[]>([]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comparisonResult, setComparisonResult] = useState<InventoryComparisonResult | null>(null);
    const [serviceNowLink, setServiceNowLink] = useState('https://service-now.com');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const aws = await db.getAWSInventory();
        const azure = await db.getAzureInventory();
        const agents = await db.getCloudAgents();
        
        setAwsInventory(aws);
        setAzureInventory(azure);
        setCloudAgents(agents);

        if (aws.length > 0 || azure.length > 0 || agents.length > 0) {
            performComparison(aws, azure, agents);
        }
    };

    const performComparison = (aws: AWSInventoryEntry[], azure: AzureInventoryEntry[], agents: CloudAgentEntry[]) => {
        const inventoryIps = new Set([
            ...aws.map(i => i.ip).filter(Boolean),
            ...azure.map(i => i.ip).filter(Boolean)
        ]);

        const matchedIps: string[] = [];
        const missingFromInventory: string[] = [];
        const notReportingAgents: CloudAgentEntry[] = [];
        
        const today = new Date().toISOString().split('T')[0];

        agents.forEach(agent => {
            if (inventoryIps.has(agent.ip)) {
                matchedIps.push(agent.ip);
            } else {
                missingFromInventory.push(agent.ip);
            }

            // Simple check if reported today (assuming lastCheckedIn starts with YYYY-MM-DD)
            if (!agent.lastCheckedIn.includes(today)) {
                notReportingAgents.push(agent);
            }
        });

        const envCounts = {
            aws: aws.reduce((acc, curr) => {
                acc[curr.environment] = (acc[curr.environment] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            azure: azure.reduce((acc, curr) => {
                acc[curr.environment] = (acc[curr.environment] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        setComparisonResult({
            matchedIps,
            missingFromInventory,
            environmentCounts: envCounts,
            notReportingAgents
        });
    };

    const handleFileUpload = async (file: File, type: 'aws' | 'azure' | 'cloud-agent') => {
        setIsProcessing(true);
        setError(null);
        try {
            if (type === 'aws') {
                const data = await parseInventoryFile(file, mapAwsRow);
                await db.setAWSInventory(data);
                setAwsInventory(data);
            } else if (type === 'azure') {
                const data = await parseInventoryFile(file, mapAzureRow);
                await db.setAzureInventory(data);
                setAzureInventory(data);
            } else {
                const data = await parseInventoryFile(file, mapCloudAgentRow);
                await db.setCloudAgents(data);
                setCloudAgents(data);
            }
            loadData();
        } catch (err) {
            setError(`Error processing ${type} file.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadReport = (data: any[], filename: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const generateTicketContent = () => {
        if (!comparisonResult) return "";
        
        return `
Ticket Subject: Cloud Agent Coverage Discrepancy & Non-Reporting Agents
        
Summary of Discrepancies:
- Total Agents in Cloud Agent List: ${cloudAgents.length}
- Total Matched with AWS/Azure: ${comparisonResult.matchedIps.length}
- Agents Missing from AWS/Azure Inventory: ${comparisonResult.missingFromInventory.length}
- Agents Not Reporting Today: ${comparisonResult.notReportingAgents.length}

Please investigate the following IPs missing from AWS/Azure inventory:
${comparisonResult.missingFromInventory.slice(0, 10).join(', ')}${comparisonResult.missingFromInventory.length > 10 ? '...' : ''}

Please check the status of these non-reporting agents:
${comparisonResult.notReportingAgents.slice(0, 10).map(a => `${a.ip} (Last: ${a.lastCheckedIn})`).join(', ')}${comparisonResult.notReportingAgents.length > 10 ? '...' : ''}
        `.trim();
    };

    const copyTicketToClipboard = () => {
        navigator.clipboard.writeText(generateTicketContent());
        alert("Ticket content copied to clipboard!");
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                        Inventory Data Hub
                    </h1>
                    <p className="text-muted-foreground">
                        Compare AWS/Azure inventories with Cloud Agent status and identify coverage gaps.
                    </p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={serviceNowLink}
                        onChange={(e) => setServiceNowLink(e.target.value)}
                        placeholder="ServiceNow Link"
                        className="bg-card border rounded-md px-3 py-1 text-sm w-64"
                    />
                    <a 
                        href={serviceNowLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-md hover:bg-primary/20 transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                        ServiceNow
                    </a>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { title: 'AWS Inventory', type: 'aws' as const, icon: Cloud, count: awsInventory.length },
                    { title: 'Azure Inventory', type: 'azure' as const, icon: Server, count: azureInventory.length },
                    { title: 'Cloud Agents', type: 'cloud-agent' as const, icon: Shield, count: cloudAgents.length },
                ].map((item) => (
                    <Card key={item.type} className="hover:shadow-lg transition-all border-primary/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <item.icon className="w-4 h-4 text-primary" />
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`
                                flex flex-col items-center justify-center py-4 border-2 border-dashed rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors relative
                                ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                            `}>
                                <input
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], item.type)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                                {item.count > 0 ? (
                                    <>
                                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                        <span className="text-2xl font-bold">{item.count}</span>
                                        <span className="text-xs text-muted-foreground">Entries Loaded</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-sm font-medium">Upload File</span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {comparisonResult && (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Environment Coverage */}
                    <Card className="border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-primary" />
                                Environment Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="text-sm font-bold mb-2">AWS Environments</h4>
                                    {Object.entries(comparisonResult.environmentCounts.aws).map(([env, count]) => (
                                        <div key={env} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                            <span>{env}</span>
                                            <span className="font-mono font-bold text-primary">{count}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="text-sm font-bold mb-2">Azure Environments</h4>
                                    {Object.entries(comparisonResult.environmentCounts.azure).map(([env, count]) => (
                                        <div key={env} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                            <span>{env}</span>
                                            <span className="font-mono font-bold text-blue-500">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Coverage Discrepancies */}
                    <Card className="border-red-500/10">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    Missing from Inventory
                                </CardTitle>
                                <button 
                                    onClick={() => downloadReport(comparisonResult.missingFromInventory.map(ip => ({ IP: ip })), 'missing_ips')}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                    title="Download CSV"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-4xl font-bold text-red-500">
                                    {comparisonResult.missingFromInventory.length}
                                    <span className="text-sm text-muted-foreground ml-2">IPs not in AWS/Azure</span>
                                </div>
                                <div className="max-h-[150px] overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-lg">
                                    {comparisonResult.missingFromInventory.map(ip => (
                                        <div key={ip} className="text-xs font-mono py-1 px-2 hover:bg-primary/5 rounded">
                                            {ip}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Non-Reporting Agents */}
                    <Card className="border-amber-500/10">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Not Reported Today
                                </CardTitle>
                                <button 
                                    onClick={() => downloadReport(comparisonResult.notReportingAgents, 'not_reporting_agents')}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                    title="Download CSV"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-4">
                                <div className="text-4xl font-bold text-amber-500">
                                    {comparisonResult.notReportingAgents.length}
                                    <span className="text-sm text-muted-foreground ml-2">Agents inactive today</span>
                                </div>
                                <div className="max-h-[150px] overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-lg">
                                    {comparisonResult.notReportingAgents.map(agent => (
                                        <div key={agent.ip} className="flex justify-between text-xs py-1 px-2 hover:bg-primary/5 rounded border-b border-border/10 last:border-0">
                                            <span className="font-mono">{agent.ip}</span>
                                            <span className="text-muted-foreground">Last: {agent.lastCheckedIn}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ServiceNow Integration */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <ClipboardList className="w-5 h-5" />
                                ServiceNow Ticket Assistant
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-card border rounded-lg h-[150px] overflow-y-auto text-xs font-mono whitespace-pre-wrap">
                                {generateTicketContent()}
                            </div>
                            <button 
                                onClick={copyTicketToClipboard}
                                className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:shadow-lg transition-all hover:scale-[1.02]"
                            >
                                Copy Ticket Content
                            </button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
