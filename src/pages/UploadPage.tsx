import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { parseVulnerabilityData } from '../utils/parser';
import { db } from '../utils/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CMDBEntry } from '../types';

export function UploadPage() {
    const [isVulnDragging, setIsVulnDragging] = useState(false);
    const [isCmdbDragging, setIsCmdbDragging] = useState(false);

    const [vulnFileReady, setVulnFileReady] = useState(false);
    const [cmdbFileReady, setCmdbFileReady] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (vulnFileReady && !isProcessing && !isCmdbDragging) {
            // Auto-redirect to dashboard after 2 seconds to 'active the dashboard and give insights'
            const timer = setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [vulnFileReady, isProcessing, isCmdbDragging, navigate]);

    const processVulnFile = async (file: File) => {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            setError('Please upload a valid CSV or Excel file for vulnerabilities.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const records = await parseVulnerabilityData(file);
            await db.setRecords(records);
            setVulnFileReady(true);
            setIsProcessing(false);
        } catch (err) {
            setError('Error processing the Vulnerability file. Please check the schema.');
            setIsProcessing(false);
        }
    };

    const processCmdbFile = async (file: File) => {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            setError('Please upload a valid CSV or Excel file for CMDB.');
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            let data: any[] = [];
            if (file.name.endsWith('.csv')) {
                data = await new Promise<any[]>((resolve, reject) => {
                    Papa.parse(file, { header: true, skipEmptyLines: true, complete: res => resolve(res.data), error: reject });
                });
            } else {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const ws = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(ws);
            }

            const cmdbRecords: CMDBEntry[] = data.map(row => ({
                applicationName: row['Application Name'] || 'Unknown App',
                apimId: row['APIM ID'] || '',
                correlationId: row['Correlation ID'] || '',
                appOwner: row['App Owner'] || '',
                businessOwner: row['Business Owner'] || '',
                environment: row['Environment'] || '',
            }));

            await db.setCMDB(cmdbRecords);
            setCmdbFileReady(true);
            setIsProcessing(false);
        } catch (err) {
            setError('Error processing the CMDB file.');
            setIsProcessing(false);
        }
    };

    const handleContinue = () => {
        // Enforce that at least the vulnerability sheet is uploaded
        if (vulnFileReady) {
            navigate('/dashboard');
        } else {
            setError('You must upload at least the primary Vulnerability Intelligence sheet.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Intelligent IVM Upload Hub</h1>
                <p className="text-muted-foreground w-[600px] mx-auto">
                    Upload your vulnerability scan results to automatically generate an executive dashboard,
                    track zero-day impacts, and analyze high-risk applications.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full">
                {/* Primary Vulnerability Sheet */}
                <Card className={vulnFileReady ? 'border-primary ring-1 ring-primary' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-primary" />
                            1. Vulnerability Intelligence
                        </CardTitle>
                        <CardDescription>Primary sheet (CISA, NVD, or Scanners)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsVulnDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsVulnDragging(false); }}
                            onDrop={(e) => { e.preventDefault(); setIsVulnDragging(false); if (e.dataTransfer.files.length > 0) processVulnFile(e.dataTransfer.files[0]); }}
                            className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${isVulnDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                  ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                  ${vulnFileReady ? 'bg-primary/5 border-primary/50' : ''}
                `}
                        >
                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={(e) => e.target.files && processVulnFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center space-y-4">
                                {vulnFileReady ? (
                                    <>
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                        <p className="text-sm font-medium">Vulnerability Data Loaded</p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                                        <p className="text-sm font-medium">Drop Primary File Here</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Secondary CMDB Data */}
                <Card className={cmdbFileReady ? 'border-primary ring-1 ring-primary' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-500" />
                            2. CMDB Correlation (Optional)
                        </CardTitle>
                        <CardDescription>Matches App Owners to Vulnerabilities</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsCmdbDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsCmdbDragging(false); }}
                            onDrop={(e) => { e.preventDefault(); setIsCmdbDragging(false); if (e.dataTransfer.files.length > 0) processCmdbFile(e.dataTransfer.files[0]); }}
                            className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${isCmdbDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                  ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                  ${cmdbFileReady ? 'bg-primary/5 border-primary/50' : ''}
                `}
                        >
                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={(e) => e.target.files && processCmdbFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center space-y-4">
                                {cmdbFileReady ? (
                                    <>
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                        <p className="text-sm font-medium">CMDB Map Loaded</p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                                        <p className="text-sm font-medium">Drop CMDB File Here</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {vulnFileReady && (
                <div className="mt-8 flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 duration-500 space-y-2">
                    <button
                        onClick={handleContinue}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                        Initialize AIST Engine
                        <CheckCircle className="w-5 h-5" />
                    </button>
                    <p className="text-sm text-muted-foreground animate-pulse">Auto-redirecting to dashboard...</p>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="flex flex-col gap-2 p-4 bg-card border rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="text-sm font-bold">IASP Enrichment</h4>
                    <p className="text-xs text-muted-foreground">Generates dynamic business impact scores.</p>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-card border rounded-lg">
                    <Database className="w-5 h-5 text-blue-500" />
                    <h4 className="text-sm font-bold">CMDB Correlation</h4>
                    <p className="text-xs text-muted-foreground">Maps vulnerabilities to application owners automatically.</p>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-card border rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h4 className="text-sm font-bold">Real-time Alerting</h4>
                    <p className="text-xs text-muted-foreground">Triggers Mock MS Teams/Email alerts on Critical threats.</p>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-card border rounded-lg">
                    <FileType className="w-5 h-5 text-purple-500" />
                    <h4 className="text-sm font-bold">Intelligent Exports</h4>
                    <p className="text-xs text-muted-foreground">Outputs structured folders mapping risk matrices.</p>
                </div>
            </div>
        </div>
    );
}
