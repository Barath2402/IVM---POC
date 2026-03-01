import { Moon, Sun, Trash2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { db } from '../utils/db';

export function Header() {
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6 justify-between w-full">
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Executive Dashboard</h1>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="rounded-md p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                        <span className="sr-only">Toggle theme</span>
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm("Are you sure you want to completely clear the local database? This cannot be undone.")) {
                                await db.clearRecords();
                                window.location.href = '/';
                            }
                        }}
                        className="rounded-md p-2 hover:bg-red-500/20 text-red-500 cursor-pointer transition-colors flex items-center gap-2"
                        title="Clear Database"
                    >
                        <Trash2 className="h-5 w-5" />
                        <span className="text-sm font-semibold hidden md:block">Clear Data</span>
                    </button>

                    <div className="flex items-center gap-2 border-l pl-4 border-border">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            A
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-foreground leading-none">Admin User</p>
                            <p className="text-muted-foreground text-xs mt-1">Security Ops</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
