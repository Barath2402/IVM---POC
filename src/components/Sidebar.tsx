import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    ShieldAlert,
    Target,
    Bot,
    SplitSquareHorizontal,
    Upload,
    Activity,
    ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
    { name: 'Data Upload', href: '/', icon: Upload },
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Weekly Metrics', href: '/metrics', icon: BarChart3 },
    { name: 'Security Center', href: '/security', icon: ShieldAlert },
    { name: 'Zero-Day Tracker', href: '/zero-day', icon: Target },
    { name: 'Agent Insights', href: '/insights', icon: Bot },
    { name: 'APIM Split View', href: '/split', icon: SplitSquareHorizontal },
    { name: 'AIST Pipeline', href: '/pipeline', icon: Activity },
    { name: 'Inventory Data', href: '/inventory', icon: ClipboardList },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-border/10">
            <div className="flex h-16 items-center px-6 border-b border-border/10">
                <ShieldAlert className="h-6 w-6 text-primary mr-3" />
                <span className="text-lg font-bold tracking-wider">IVM Dashboard</span>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                    isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-border/10">
                <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-xs font-semibold text-primary mb-1">System Status</p>
                    <div className="flex items-center text-xs text-sidebar-foreground/70">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        All systems operational
                    </div>
                </div>
            </div>
        </div>
    );
}
