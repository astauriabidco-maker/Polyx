import React from 'react';

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <h3 className={`font-semibold leading-none tracking-tight text-xl ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-sm text-slate-500 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>;
}
