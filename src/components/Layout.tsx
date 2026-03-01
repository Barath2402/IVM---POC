import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ThemeProvider } from './ThemeProvider';

export function Layout() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="ivm-theme">
            <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
                <Sidebar />
                <div className="flex flex-col flex-1 w-full overflow-hidden relative">
                    <Header />
                    <main className="flex-1 relative overflow-y-auto w-full p-6 pb-16">
                        <Outlet />
                    </main>
                    {/* Animated Footer */}
                    <div className="absolute bottom-0 w-full bg-background/80 backdrop-blur-sm border-t border-border py-2 px-4 text-center z-50">
                        <p className="text-sm font-bold tracking-wide animate-pulse bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
                            Proof of concept of Team Dhinakaran and Barathraj from IVM
                        </p>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}
